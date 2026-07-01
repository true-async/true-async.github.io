---
layout: docs
lang: es
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /es/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): helpers listos para text/event-stream sobre HTTP/1.1, HTTP/2 y HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) es una forma simple de transmitir eventos de texto al navegador sobre
una conexión HTTP normal, en un solo sentido: del servidor al navegador. A diferencia de
WebSocket, no necesita un protocolo separado ni un handshake de Upgrade: el servidor simplemente
mantiene la respuesta abierta y va añadiendo eventos nuevos a medida que están listos. El
navegador los consume con la API integrada `EventSource`, sin bibliotecas adicionales.

`HttpResponse` ofrece cuatro métodos para `text/event-stream`: `sseStart()`, `sseEvent()`,
`sseComment()` y `sseRetry()`. Es una capa fina de formateo sobre el mismo
[pipeline de `send()`](/es/docs/server/streaming.html), así que el mismo manejador funciona sin
cambios sobre HTTP/1.1, HTTP/2 y HTTP/3, y el protocolo lo elige el cliente.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // stream de larga duración: sin deadline de escritura

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // opcional: el primer sseEvent()/sseComment() también inicia el stream
    $res->sseRetry(3000);      // indica al navegador que reconecte a los 3s si se corta
    $res->sseComment('stream open');   // heartbeat, evita que los proxies dejen inactiva la conexión

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // el cliente ya no está, no tiene sentido esperar
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Lado del navegador:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Cambia la respuesta a modo SSE y fija las cabeceras: `Content-Type: text/event-stream`,
`Cache-Control: no-cache, no-transform` y `X-Accel-Buffering: no` (esta última le indica a nginx
que no almacene en buffer la respuesta; sin ella, los eventos se quedan atascados detrás del
buffer del proxy hasta que este se llena). La respuesta también se marca como no comprimible: un
stream gzip con buffer anularía el propósito de la entrega en tiempo real.

La llamada es opcional: el primer `sseEvent()`/`sseComment()` también inicia el stream por su
cuenta. Pero `sseStart()` por sí sola **no** envía la línea de estado ni las cabeceras al cable,
el commit es diferido y ocurre en el primer evento real. Para abrir el stream de inmediato (por
ejemplo, para desbloquear el `onopen` del navegador antes de que haya un evento real listo),
envía un `sseComment()` vacío: eso inicia el stream y confirma las cabeceras al instante.

Lanza `HttpServerInvalidArgumentException` si el manejador ya había establecido su propio
`Content-Type`, y `HttpServerRuntimeException` si la respuesta ya está en streaming, cerrada, u
ocupada con `sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Formatea y envía un evento SSE, iniciando el stream si hace falta. El `$data` multilínea se
divide por `\n` / `\r\n` / `\r` y se envía como varios campos `data:` (WHATWG §9.2). `$event`,
`$id` y `$retry` se incluyen solo cuando no son `null`. El registro termina con una línea en
blanco para que el navegador despache el evento de inmediato.

- `$event` y `$id` no deben contener `\r`/`\n` (de lo contrario el parser los leería como
  separador de campo/registro), y `$id` no debe contener NUL (según WHATWG, un NUL hace que el
  parser ignore el id completo): las violaciones lanzan `HttpServerInvalidArgumentException`.
- `$retry` debe ser no negativo.
- Una cadena vacía `$data === ''` también es válida, despacha un `MessageEvent` vacío.
- Los cuatro argumentos en `null` no hacen nada. El parser de `EventSource` ignora en silencio un
  evento sin `data` ni `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Envía una línea de comentario (un registro que empieza con `:`). Los navegadores ignoran los
comentarios, pero mantienen la conexión viva ante los timeouts de inactividad de los proxies
intermedios (el `proxy_read_timeout` de nginx, 60s por defecto). Llámalo periódicamente como
heartbeat. El payload canónico es una cadena vacía, que se convierte en `:\n\n` en el cable.
`$text` no debe contener `\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Envía una directiva `retry:` indicando al navegador cuántos milisegundos esperar antes de
reconectar tras la caída del stream. Es azúcar sintáctico para `sseEvent(retry: $milliseconds)`
sin payload.

## Contrapresión: `sendable()`

Igual que `send()`, cada método SSE suspende la corrutina del manejador solo ante contrapresión
real, es decir, cuando el buffer intermedio del stream está lleno. La comprobación `sendable()`
no bloquea y es orientativa: `false` significa que la próxima llamada suspendería, que la
respuesta ya está cerrada, o que este tipo de respuesta no admite streaming en absoluto. Útil
para no esperar a un cliente lento cuando hay otro trabajo pendiente.

## Véase también

- [`HttpResponse::sseStart()`](/es/docs/reference/server/http-response.html#ssestart) y el resto
  de métodos SSE en la referencia
- [Streaming](/es/docs/server/streaming.html): el `send()`/`sendable()` de bajo nivel sobre el
  que se construye SSE
- [Ejemplos](/es/docs/server/examples.html#sse-server-sent-events)
