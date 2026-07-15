---
layout: tutorial
lang: es
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /es/tutors-server/08-workers.html
page_title: "Workers y HTTP/3"
description: "setWorkers(): los hilos de la primera serie bajo el capó del servidor, el bootloader y HTTP/3 en el mismo puerto."
---

# Workers y HTTP/3

Abre algún htop en el servidor bajo carga. Nuestro proceso está sudando
la gota gorda, miles de peticiones en vuelo... y de ocho núcleos, uno
está ocupado. Siete ociosos. ¿Molesto? Molesto.

No hay nada nuevo en esto, lo cubrimos en el capítulo sobre hilos:
mientras las tareas esperan en I/O, un núcleo basta para todos. Pero
bajo tráfico real el servidor no solo espera. El parseo de HTTP, los
handshakes de TLS, la serialización de JSON, eso son cálculos, y chocan
contra ese único núcleo.

La receta de ese mismo capítulo: dale hilos al cálculo. El servidor la
aplica en una sola línea:

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` arranca N workers, y es literalmente `Async\ThreadPool`
del capítulo catorce. No un "mecanismo parecido", sino el mismísimo. Lo
que significa que ya conoces también las reglas: cada worker es un hilo
del sistema operativo aparte con su propio entorno PHP, su propio event
loop, sus propios pools. La configuración y los handlers se copian en
cada worker por las reglas habituales de paso entre hilos. `start()` en
el padre espera a todos ellos.

Queda una pregunta: ¿quién entrega las conexiones entrantes a los
workers? Y aquí viene lo más bonito. Nadie. Cada worker abre el mismo
puerto con el flag `SO_REUSEPORT`, y de ahí el propio kernel de Linux
distribuye las conexiones entre ellos. Ningún dispatcher, ninguna cola,
ningún lock. Ocho servidores independientes escondidos tras un puerto.

## Bootloader: calentando cada worker

En la primera serie el ThreadPool tenía un bootloader, y allí parecía una
comodidad opcional. Aquí se convierte en la figura central. He aquí por
qué: todo lo que hicimos en el primer capítulo "una vez, antes de
`start()`" ahora tiene que ocurrir en cada worker. Cada uno tiene su
propia memoria, al fin y al cabo.

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // su propio Pool de PDO en cada worker
        Router::compile();
    });
```

El closure corre una vez por worker, antes de la primera petición. Una
excepción dentro de él detiene todo el pool. ¿Duro? Correcto: un
servidor con un worker mal calentado de ocho es una máquina que dispara
errores a cada octavo cliente. Mejor que no arranque en absoluto.

## El chat se topa con los workers

Y ahora la explosión prometida. En el capítulo anterior construimos un
chat sobre la fórmula "estado compartido en la memoria del proceso".
Relee la fórmula despacio. En la memoria. Del proceso.

¿Cuál de los ocho?

El kernel dispersa las conexiones como le place. Alice cayó en el worker
3, Bob en el worker 5. Cada worker tiene su propia memoria, y por tanto
su propio `$room`. Dos salas con el mismo nombre que nunca sabrán una de
la otra. Alice escribe al vacío, Bob calla en un vacío diferente. Sin
carreras, sin errores, el chat simplemente dejó de ser un chat en
silencio.

El arreglo clásico es sacar el estado compartido fuera del proceso, a un
pub/sub de Redis, y dejar que los workers hablen a través de él.
Funciona, pero ahora un chat necesita un segundo servicio corriendo a su
lado solo para pasar mensajes entre hilos del mismo servidor.

Así que el servidor trae su propia respuesta: **topics**. Una conexión
se suscribe a un nombre, un mensaje se publica a ese nombre, y el
servidor lo entrega a cada suscriptor —en cada worker—. Sin array de
conexiones, sin Redis.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = $req->getQueryParam('room', 'lobby');
    $name = $req->getQueryParam('name', 'guest');

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", "$name: {$msg->data}");
    }
});
```

Compáralo con la sala del capítulo anterior. El `SplObjectStorage`
desapareció, y con él el bucle manual de broadcast y el `finally` que
barría los fantasmas. `subscribe()` mete esta conexión en la sala;
`publish()` envía una línea a todos los que están en ella. Una conexión
que se cierra abandona sus salas por su cuenta. Y donde la vieja sala
vivía en la memoria de un worker, un topic las abarca todas: Alice en el
worker 3 y Bob en el worker 5 están de nuevo en el mismo `chat/general`.

`publish()` nunca bloquea —un peer cuyo buffer está lleno descarta la
línea en lugar de frenar la sala, el mismo compromiso que hacía
`trySend()`—. Devuelve el número de suscriptores locales a los que
llegó; la entrega a los otros workers ocurre entre bastidores. El nombre
no es solo una cadena, es un [filtro MQTT](/es/docs/server/websocket.html#topics-publishsubscribe-en-todos-los-workers):
suscríbete a `chat/+/typing` y recibes la señal de escritura de cada
sala a la vez.

`setWorkers(1)` sigue siendo una respuesta honesta para un sistema
pequeño: un solo worker sostiene miles de conexiones WebSocket que en su
mayoría esperan, sin problema. Pero ya no tienes que elegirlo solo para
mantener un chat funcionando. Una regla para recordar: el estado de la
petición vive en el scope de la petición, el estado del proceso en el
worker, y el estado compartido o bien en un topic o bien en
almacenamiento externo.

## HTTP/3: los mismos handlers, un transporte diferente

Ya que estamos escalando, llevemos el stack a lo moderno. Sobre HTTP/3
basta con saber tres cosas. Funciona no sobre TCP sino sobre QUIC sobre
UDP. Establece una conexión más rápido y no deja que un paquete perdido
atasque todos los flujos a la vez. Y es obligatorio aprenderlo, porque
los navegadores ya lo prefieren.

¿Suena a una gran obra de construcción? Mira:

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP: HTTP/1.1 y HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP: HTTP/3
```

Una línea, `addHttp3Listener`. El mismo puerto, y no hay conflicto:
443/TCP escucha para HTTP/1.1 y HTTP/2, mientras que 443/UDP va a QUIC.
No tiene un flag TLS aparte, porque según la especificación QUIC no
existe sin TLS; los certificados se toman del servidor.

¿Cómo se enteran los clientes de la entrada por UDP? Por su cuenta. A
cada respuesta sobre TCP el servidor añade una cabecera
`Alt-Svc: h3=":443"`. El navegador la ve y envía las siguientes
peticiones sobre HTTP/3. Primera visita sobre HTTP/2, luego QUIC, y
nadie configuró nada.

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

¿Sabes qué es lo que más me gusta de este capítulo? Lo que no está en
él. Encendimos ocho hilos y la tercera versión de HTTP, y ni una sola
línea cambió en los handlers. El enrutamiento del capítulo dos, el SSE
del capítulo seis, el chat del capítulo siete, ninguno de ellos es
consciente de que el mundo a su alrededor se volvió multihilo y empezó a
hablar QUIC. El escalado se mudó a la config, donde le corresponde.

El servidor se volvió rápido. El siguiente paso es hacerlo insumergible:
qué hacer ante la sobrecarga, ante los clientes lentos, ante el
despliegue en pleno tráfico. Un capítulo sobre los días malos.
