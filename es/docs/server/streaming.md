---
layout: docs
lang: es
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /es/docs/server/streaming.html
page_title: "TrueAsync Server: transferencia por bloques de solicitud y respuesta"
description: "readBody(): lectura del cuerpo de la solicitud por bloques. send()/sendable(): envío de la respuesta por bloques con contrapresión. Trailers HTTP/2."
---

# Transferencia por bloques de solicitud y respuesta

(PHP 8.6+, true_async_server 0.6+)

## Lectura del cuerpo de la solicitud por bloques: `readBody()`

Por defecto, el manejador recibe el cuerpo ya leído por completo (`HttpRequest::getBody()`).
Con `HttpServerConfig::setBodyStreamingEnabled(true)` los parsers H1/H2 colocan los bloques DATA
en una cola FIFO vinculada a la solicitud, y el manejador los va retirando uno a uno mediante
`HttpRequest::readBody()`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setBodyStreamingEnabled(true)
);

$server->addHttpHandler(function ($req, $res) {
    $fp = fopen('/tmp/upload-' . bin2hex(random_bytes(8)), 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($fp, $chunk);
        $total += strlen($chunk);
    }
    fclose($fp);

    $res->json(['received' => $total]);
});

$server->start();
```

### Semántica

- Cada llamada a `readBody()` devuelve **un** bloque entregado por el parser:
  - un frame DATA de H2 (por defecto hasta 16 KiB);
  - un trozo de `on_body` de llhttp (limitado por el buffer de lectura de H1 = 8 KiB).
- Cuando la cola está vacía, la corrutina queda suspendida en un evento-disparador de la solicitud.
- Al alcanzar el final del flujo se devuelve `null` (idempotente).
- Ante un error del flujo (peer reset, superar `max_body_size`) se lanza `\Exception`.
- El parámetro `$maxLen` está reservado para una futura agregación de bloques y por ahora se
  ignora. La firma se mantiene binariamente compatible con la mejora prevista (issue #26).

### Cuándo activarlo

- Subidas grandes de archivos (logs, multimedia, backups).
- Parsing por bloques (NDJSON, MessagePack stream).
- Servicios cuya latencia de cola (p99) empeora al retener el cuerpo en memoria.
- Multipart **siempre** va por streaming, con independencia de `setBodyStreamingEnabled()`.

Cuándo **no** activarlo: endpoints REST con cuerpos compactos donde es más cómodo trabajar con
`getBody()`/`getPost()`/`getQuery()` íntegro. No se admite el modo combinado (streaming solo
cuando el cuerpo > X); `getBody()` en modo streaming lanza `LogicException` (previsto en la
hoja de ruta).

### Consumo de memoria

Con 50 solicitudes POST paralelas de 20 MiB (h2load, WSL2): el RSS pico baja de 1170 MiB a
**197 MiB** (×6). El throughput sube de 36 req/s a **100 req/s** (×2.7), porque la invocación del
manejador ya no espera al cuerpo completo.

## Envío de la respuesta por bloques: `send()` / `sendable()`

La respuesta simple mediante `setBody()` / `json()` / `html()` / `redirect()` sale en un único
bloque.

Para el envío por bloques (transferencia chunked en H1, frames DATA en H2) se usa `send($chunk)`:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: los eventos deben llegar al cliente de inmediato

    // El primer send() fija el status + las cabeceras (ya no se pueden cambiar)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Contrapresión (backpressure)

`send()` suspende la corrutina del manejador **solo** ante contrapresión: cuando el buffer
intermedio del stream está lleno. En condiciones normales la función devuelve el control de
inmediato.

HTTP/2: la presión se activa cuando se llenan los slots del ring buffer **o bien** cuando se
supera `HttpServerConfig::setStreamWriteBufferBytes()` (por defecto 256 KiB).
HTTP/1 chunked usa el buffer de envío del kernel.

### `sendable()`

Comprobación no bloqueante de carácter orientativo: devuelve `true` si `send()` aceptará un bloque
sin suspender la corrutina. `false` significa una de estas tres cosas: `send()` se suspenderá, la
respuesta está cerrada o sellada por una llamada a `sendFile()`, o no es un tipo de respuesta que
admita transferencia por bloques.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // no queremos esperar a un cliente lento; nos ocupamos de otra cosa
        $event->save();   // persistir en BD
        continue;
    }
    $res->send($event->encode());
}
```

`send()` **siempre** se puede llamar sin riesgo, con independencia de `sendable()`. Este último
solo da al manejador la oportunidad de ocuparse de otra tarea en vez de quedarse esperando a un
cliente lento.

## Trailers HTTP/2

HTTP/2 admite un frame HEADERS después del cuerpo (trailers). El consumidor canónico es gRPC
(`grpc-status` en el trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Asignación masiva:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // retirar todos
$res->getTrailers();
```

En HTTP/1.1 el valor se **ignora silenciosamente**: el envío de trailers en codificación chunked
no está aún implementado (Step 5b).

> Los nombres de los trailers se escriben en minúsculas (RFC 9113 §8.2.2); las mayúsculas se
> convierten automáticamente.

## Véase también

- [`HttpServerConfig::setBodyStreamingEnabled()`](/es/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/es/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/es/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/es/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/es/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/es/docs/reference/server/http-response.html#settrailer)
