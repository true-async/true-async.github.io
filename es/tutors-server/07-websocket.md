---
layout: tutorial
lang: es
path_key: "/tutors-server/07-websocket.html"
nav_active: docs
permalink: /es/tutors-server/07-websocket.html
page_title: "WebSocket"
description: "WebSocket: el bucle recv, una sala de chat, enviar desde otras corrutinas y trySend contra clientes lentos."
---

# WebSocket

En un chat de soporte, ambos lados escriben. El usuario hace una
pregunta, el operador responde, y ninguno espera al otro: los mensajes
van en ambas direcciones cuando se escriben.

¿Podemos armar semejante chat con herramientas que ya conocemos? Hacia
abajo, del servidor al navegador, SSE lo llevará, eso lo sabemos hacer
desde el capítulo de ayer. ¿Y hacia arriba? Hacia arriba tendríamos que
enviar un POST aparte por cada línea del usuario. Una petición nueva,
cabeceras, una respuesta, una desconexión. Y así por cada "gracias, eso
ayudó". Funcionaría, pero no particularmente bien.

Para una conversación de dos direcciones hay un protocolo aparte,
WebSocket.

Está construido de forma sorprendentemente modesta. El cliente envía una
petición HTTP corriente con una cabecera `Upgrade`: una propuesta de
cambiar a otro protocolo. El servidor accede: `101 Switching Protocols`.
Y ya está, el HTTP terminó. Sobre la misma conexión TCP, los mensajes
ahora viajan en ambas direcciones, sin peticiones y sin respuestas.

```php
use TrueAsync\WebSocket;

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});
```

El servidor toma el handshake enteramente sobre sí: el handler se llama
una vez que la conexión ya está cambiada, y recibe un objeto listo. El
modelo es familiar: una conexión, una corrutina. `WebSocket` implementa
`Iterator`, y es el iterador el que duerme a la corrutina hasta el
siguiente mensaje. El cliente se fue, el bucle terminó, el servidor
cerró la conexión él mismo con el código `1000 Normal`. Y los handlers
HTTP corrientes siguen funcionando al lado, en el mismo puerto.

## Una sala de chat

El echo es un calentamiento. En un chat real, el mensaje de un
participante debe llegar a todos los demás. Detente un segundo en lo que
eso significa técnicamente: la corrutina que atiende una conexión debe
escribir en las otras. ¿Suena a fuente de problemas? Mira:

```php
use TrueAsync\HttpRequest;

/** @var SplObjectStorage<WebSocket, string> $room */
$room = new SplObjectStorage();

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) use ($room) {
    $name = $req->getQueryParam('name', 'guest');
    $room->attach($ws, $name);
    $ws->send("Welcome, people in the room: {$room->count()}");

    try {
        foreach ($ws as $msg) {
            foreach ($room as $peer) {
                if ($peer !== $ws) {
                    $peer->trySend("$name: {$msg->data}");
                }
            }
        }
    } finally {
        $room->detach($ws);
    }
});
```

Treinta líneas, y dentro de ellas confluyen a la vez tres hilos de la
primera serie. No pases de largo, cada uno merece una pausa.

El primero: la sala es solo un objeto. Un `SplObjectStorage` corriente,
compartido entre todas las corrutinas, sin un solo lock. El capítulo
sobre canales prometió que dentro de un mismo hilo esto está permitido,
y aquí está en acción.

El segundo: `finally`. Un participante puede irse de forma ordenada,
puede desvanecerse junto con el Wi-Fi, o la corrutina puede ser
cancelada por el propio servidor al apagarse. Tres escenarios, un
`finally`, y se garantiza que ningún fantasma se quede rondando en la
sala. La cancelación cooperativa tal cual es.

El tercero: escribir en la conexión de otro está permitido desde
cualquier corrutina. `send()` y `trySend()` son seguros para esto; el
propio servidor se asegura de que los frames de distintos remitentes no
se mezclen en el cable. La lectura, en cambio, es solo desde una. Un
segundo `recv()` concurrente sobre la misma conexión recibe una
excepción, y con razón: un flujo de bytes no tiene semántica con sentido
para dos lectores.

## Un cliente lento no detendrá la sala

¿Notaste que la difusión usa `trySend`, no `send`? Eso no es una errata,
es una decisión, y vale la pena hablarla a fondo.

¿Qué hace `send()` con un buffer lleno? Exacto, backpressure: duerme a
la corrutina hasta que el cliente despeje el atasco. Para una respuesta
personal, eso es justo lo que quieres. Ahora imagínatelo en un bucle de
difusión. Un participante se metió en un túnel con su internet móvil, su
buffer está lleno, y... toda la sala espera. Cien personas no reciben
mensajes porque una tiene mala cobertura.

`trySend()` nunca espera. O el mensaje se acepta en el buffer y `true`, o
el buffer está lleno y `false`, el mensaje descartado. El chat sacrifica
deliberadamente los mensajes del rezagado para no castigar a todos.
¿Cruel? Para un chat, no: una línea perdida en una sala no es tragedia.
Si en tu tarea no se permite perder, usa `send()` y aguanta las pausas,
o construye una cola por cliente. Ambas estrategias son honestas, la
elección es tuya.

Como último recurso hay también una salvaguarda: si `send()` lleva
colgado a la espera más tiempo que el timeout de escritura, lanza
`WebSocketBackpressureException`. Esto es sobre un cliente que mantiene
la conexión abierta pero no lee en absoluto.

## ¿Quién los dejó entrar al chat?

Ahora mismo cualquiera puede entrar a la sala. Si quieres comprobar en
la puerta, declara un tercer parámetro en el handler, y el servidor
pasará el objeto del handshake:

```php
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(
    function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade) use ($room) {
        if (authenticate($req) === null) {
            $upgrade->reject(401, 'auth required');
            return;
        }

        // ... la sala ...
    }
);
```

`reject()` responde con un error HTTP corriente en lugar de cambiar el
protocolo. A través del mismo objeto también se negocia un subprotocolo,
si el cliente ofrece alguno.

El chat está listo: la sala en memoria, difusión instantánea, los
rezagados no ralentizan a nadie. Recuerda la fórmula sobre la que todo
se apoya: "estado compartido en la memoria del proceso". Recuérdala
bien. En el próximo capítulo encenderemos varios workers para ocupar
todos los núcleos de la máquina, y esa fórmula inocente será la primera
en reventar.
