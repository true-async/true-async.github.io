---
layout: tutorial
lang: es
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /es/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE: un flujo de eventos hacia el navegador, progreso de importación y heartbeat con sseComment()."
---

# Server-Sent Events

Así que la importación de direcciones ahora empieza con un botón en la
página. El usuario hizo clic, el archivo salió, empezó el
procesamiento. Corre durante unos diez minutos. ¿Qué ve el usuario todo
ese tiempo?

Exacto, un spinner girando. Durante diez minutos. Sin una sola señal de
vida. Alrededor del tercer minuto decidirá que todo se congeló,
refrescará la página y arrancará la importación por segunda vez.
Necesitamos una barra de progreso.

La solución clásica es el polling: el navegador consulta
`/import/progress` una vez por segundo, el servidor responde con un
número. ¿Funciona? Funciona. Pero haz la cuenta: seiscientas peticiones
en diez minutos, con cabeceras, con un ciclo de procesamiento completo,
y en cada una la carga útil es un solo número. Lo que preferiríamos es
lo contrario: el navegador se conecta una sola vez, y a partir de ahí el
servidor mismo envía el número cada vez que cambia.

Eso es exactamente lo que hace `SSE`, `Server-Sent Events`. Ningún
protocolo nuevo. Una respuesta `HTTP` corriente que el servidor no
cierra, sino a la que sigue añadiendo eventos. Del lado del navegador
los recibe el `EventSource` integrado, sin una sola librería.

## Progreso hacia el navegador

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... enrutamiento ... */ }

    $import = currentImport(); // ese mismo ImportService de la primera serie

    $res->sseStart();
    $res->sseRetry(3000); // si el flujo se corta, el navegador se reconecta en 3 segundos

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // la pestaña se cerró, no hay a quién dibujarle
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

Y en el navegador:

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

Fíjate bien en la estructura del handler. Un bucle. Tomar una lectura.
`delay(1000)`. ¿Te suena? Es la corrutina de progreso del primerísimo
capítulo, letra por letra. Solo cambió la última línea: en lugar de
`echo` al terminal, `sseEvent()` dentro de una respuesta abierta. Quince
capítulos después la barra de progreso llegó al navegador, y el código
apenas cambió. Y, como entonces, el progreso no sabe nada de la
importación, y la importación no sabe nada del progreso.

Tampoco hay magia bajo el capó: los métodos SSE son un fino formateo
sobre `send()` del capítulo cuatro. De ahí, dos regalos gratis.
Backpressure: una pestaña lenta no se comerá la memoria del servidor. E
independencia del protocolo: el mismo handler funciona sobre `HTTP/1.1`,
`HTTP/2` y `HTTP/3`, y el navegador elige.

## Silencio largo y el heartbeat

Una conexión `SSE` vive durante minutos y horas. La vida larga, como de
costumbre, tiene sus propios males. Aquí hay dos.

El primero: el timeout de escritura. Por defecto el servidor limita
cuánto puede tardar en enviarse una respuesta, y eso es correcto. Pero
una respuesta SSE se está "enviando" para siempre, esa es su naturaleza.
Para un servicio con flujos apagas el límite:

```php
$config->setWriteTimeout(0);
```

El segundo mal es más sutil. Supón que la importación se atasca durante
mucho rato: está calculando algo pesado, no salen eventos. Para nosotros
es una pausa, pero para algún proxy entre el servidor y el navegador es
una conexión muerta que toca eliminar. Y la eliminará, nginx por defecto
usa sesenta segundos para esto.

La cura es cómica de puro simple:

```php
$res->sseComment(); // en el cable: ":\n\n"
```

Un comentario. Un evento que el navegador ignora en silencio, pero que
viaja por el cable y convence a cada intermediario de que la conexión
está viva. Envíalo con un temporizador durante las pausas, y el flujo
sobrevivirá a cualquier silencio.

## Cortes y recuperación

La red móvil parpadeó, el flujo se cortó. ¿Qué hacer? Nada. En serio:
`EventSource` restablece la conexión él mismo, tras esperar el intervalo
de `sseRetry()`.

Lo único con lo que vale la pena ayudarle es a no empezar desde cero.
Numera los eventos:

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

Al reconectar el navegador envía una cabecera `Last-Event-ID` con el
último número que recibió, y el handler continúa exactamente desde ese
punto:

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

Entrega, reconexión, ponerse al día con lo que se perdió. Un canal de
notificaciones honesto, y todo ello sobre el HTTP más corriente.

Con una salvedad: el canal es de una sola dirección. El servidor habla,
el navegador escucha. Para una barra de progreso eso es ideal. ¿Pero
para un chat de soporte, donde escriben ambos lados? Para un chat vas a
necesitar algo más serio.
