---
layout: docs
lang: es
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /es/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse: status, cabeceras, cuerpo, streaming mediante send()/sendable(), trailers HTTP/2, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Objeto de respuesta con interfaz fluent. Se pasa como segundo parámetro al manejador. Lo crea el
servidor; no se construye desde el código de usuario.

```php
namespace TrueAsync;

final class HttpResponse
{
    // status
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // cabeceras
    public function setHeader(string $name, string|array $value): static;
    public function addHeader(string $name, string|array $value): static;
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function resetHeaders(): static;

    // trailers (HTTP/2)
    public function setTrailer(string $name, string $value): static;
    public function setTrailers(array $trailers): static;
    public function resetTrailers(): static;
    public function getTrailers(): array;

    // introspección de protocolo
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // cuerpo
    public function write(string $data): static;
    public function send(string $chunk): static;
    public function sendable(): bool;
    public function setNoCompression(): static;
    public function getBody(): string;
    public function setBody(string $body): static;
    public function getBodyStream(): mixed;       // TODO
    public function setBodyStream(mixed $stream): static;  // TODO

    // helpers
    public function json(array|string|object|null|int|float|bool $data, int $status = 200, int $flags = 0): static;
    public function html(string $html): static;
    public function redirect(string $url, int $status = 302): static;

    // envío / estado
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;
    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## Status

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

Código HTTP 100..599.

### getStatusCode

```php
public HttpResponse::getStatusCode(): int
```

### setReasonPhrase / getReasonPhrase

```php
public HttpResponse::setReasonPhrase(string $phrase): static
public HttpResponse::getReasonPhrase(): string
```

`"OK"`, `"Not Found"`, etc.

## Cabeceras

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Establece una cabecera reemplazando los valores anteriores.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Añade un valor a los existentes (por ejemplo `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Lectura case-insensitive de lo que ha puesto el handler.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Quita todas las cabeceras.

## Trailers (HTTP/2)

Frame HEADERS enviado tras el cuerpo. Consumidor canónico: gRPC (`grpc-status`).
**En HTTP/1.1 el valor se ignora silenciosamente**: la emisión de trailers en codificación chunked
no está en scope del Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

El nombre es minúsculas (RFC 9113 §8.2.2); las mayúsculas se convierten automáticamente.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Bulk-set. Los trailers existentes se conservan; para limpieza total llama antes a
`resetTrailers()`.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Protocolo

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // siempre "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Cuerpo

### write

```php
public HttpResponse::write(string $data): static
```

Append al buffer interno del body. El envío se hace en `end()` / al volver automáticamente del
manejador.

### send

```php
public HttpResponse::send(string $chunk): static
```

Envía un chunk al cliente (streaming).

- El **primer** `send()` fija el status + las cabeceras; ya no se pueden cambiar.
- Las siguientes llamadas hacen append de frames DATA (HTTP/2) o segmentos chunked (HTTP/1).
- Bloquea la corrutina del handler **solo** ante contrapresión (staging buffer per-stream lleno).
  Umbral por defecto: `setStreamWriteBufferBytes()` = 256 KiB.
- En condiciones normales regresa de inmediato.

### sendable

```php
public HttpResponse::sendable(): bool
```

Comprobación no bloqueante de carácter orientativo:

- `true`: `send()` aceptará el chunk sin suspender la corrutina.
- `false`: `send()` se bloqueará por contrapresión, la respuesta ya está sellada por `sendFile()`
  o cerrada, o no es un tipo de respuesta que admita streaming.

`send()` **siempre** se puede llamar sin riesgo; `sendable()` solo da al handler la oportunidad
de ocuparse de otra tarea en vez de quedarse bloqueado ante un peer lento.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Prohíbe la compresión para esta respuesta, prevaleciendo sobre Accept-Encoding, whitelist MIME y
umbral de tamaño. Aplícalo en: endpoints sensibles a BREACH (secretos + user input reflejado),
payloads con `Content-Encoding` ya establecido, bodies que el servidor no debe envolver.
Idempotente.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set del contenido actual del buffer.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

Serialización JSON mediante `php_json_encode_ex` (misma ruta que `json_encode()`):

- `array` / `object` / scalar en `$data` → codificado.
- `string` en `$data` → se envía **tal cual** (JSON cacheado, bytes precompuestos). Se omite la
  re-codificación.

`Content-Type: application/json` se establece **solo** si el handler no ha puesto el suyo. Cadena
`setHeader('Content-Type', 'application/problem+json')->json($payload)` para otro media-type.

`$flags` es la bitmask `JSON_*`. `0`: defaults del servidor de
[`HttpServerConfig::setJsonEncodeFlags()`](/es/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` de serie).

`JSON_THROW_ON_ERROR` se elimina silenciosamente: un error de encode produce un `500` JSON de
error y la excepción no se propaga. El handler nunca debe envolver `json()` en try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Establece `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Envío

### end

```php
public HttpResponse::end(?string $data = null): void
```

Termina la respuesta y la envía al cliente. Tras `end()` no se puede escribir más.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Entrega de archivo controlada por el handler. Registra path + options en la respuesta y
**regresa de inmediato**; la entrega se hace en la fase de dispose mediante la misma FSM que
`StaticHandler` (MIME, ETag, IMF-date, Range, GET condicional, sidecars precomprimidos).

**Tras `sendFile()` la respuesta queda sellada**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / otra llamada a `sendFile()` lanzan
`HttpServerRuntimeException`.

La ruta es **de confianza** (el handler decidió sobre el acceso). Los errores de open/fstat
(`ENOENT`, `EACCES`, oversize, no-regular) producen 500, porque las cabeceras aún no están en el
cable.

El middleware de compresión se omite para los bodies de sendFile (pipeline de entrega propia).

> La ruta HTTP/3 para `sendFile()` está en desarrollo; por ahora el dispose-hook de H3 responde
> con 500.

Véase [`SendFileOptions`](/es/docs/reference/server/send-file-options.html).

## Estado

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Ejemplo

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        $res
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/event-stream')
            ->setHeader('Cache-Control', 'no-store')
            ->setNoCompression();

        foreach (loadEvents() as $event) {
            $res->send("data: " . json_encode($event) . "\n\n");
        }
        return;
    }

    // sendFile
    if ($req->getPath() === '/report.pdf') {
        $res->sendFile('/var/reports/q1.pdf', new SendFileOptions(
            disposition:  SendFileDisposition::ATTACHMENT,
            downloadName: 'Q1-Report.pdf',
        ));
        return;
    }

    // JSON
    $res->json(['ok' => true]);
});
```

## Véase también

- [`TrueAsync\HttpRequest`](/es/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/es/docs/reference/server/send-file-options.html)
- [Streaming](/es/docs/server/streaming.html)
- [Compresión](/es/docs/server/compression.html)
