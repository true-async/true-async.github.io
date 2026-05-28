---
layout: docs
lang: es
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /es/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest: representación de solo lectura de una solicitud HTTP — método, URI, cabeceras, cuerpo, query, multipart, W3C Trace Context, body streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Objeto de solo lectura que se pasa como primer parámetro al manejador. Lo crea el servidor; no
se construye desde el código de usuario.

```php
namespace TrueAsync;

final class HttpRequest
{
    // --- general ---
    public function getMethod(): string;
    public function getUri(): string;
    public function getPath(): string;
    public function getHttpVersion(): string;
    public function isKeepAlive(): bool;

    // --- query ---
    public function getQuery(): array;
    public function getQueryParam(string $name, mixed $default = null): mixed;

    // --- cabeceras ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- cuerpo ---
    public function getBody(): string;
    public function hasBody(): bool;
    public function awaitBody(): static;
    public function readBody(int $maxLen = 65536): ?string;

    // --- multipart / form ---
    public function getPost(): array;
    public function getFiles(): array;
    public function getFile(string $name): ?UploadedFile;

    // --- W3C Trace Context ---
    public function getTraceParent(): ?string;
    public function getTraceState(): ?string;
    public function getTraceId(): ?string;
    public function getSpanId(): ?string;
    public function getTraceFlags(): ?int;
}
```

## General

### getMethod

```php
public HttpRequest::getMethod(): string
```

`"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc.

### getUri

```php
public HttpRequest::getUri(): string
```

URI completa de la solicitud: ruta + query string.

### getPath

```php
public HttpRequest::getPath(): string
```

Ruta sin query-string. Por ejemplo, `/search` a partir de `/search?q=hello`. Uniforme para
HTTP/1.1, HTTP/2 (pseudo-header `:path`) y HTTP/3. Junto con `getQuery()` usa un único parse
perezoso: la URI se divide en path/query en el primer acceso y se cachea en la request-struct.

### getHttpVersion

```php
public HttpRequest::getHttpVersion(): string
```

`"1.1"`, `"2"`, `"3"`.

### isKeepAlive

```php
public HttpRequest::isKeepAlive(): bool
```

## Query

### getQuery

```php
public HttpRequest::getQuery(): array
```

Todos los parámetros de query como array asociativo, equivalente a `$_GET`. Admite
percent-decoding, `+` como espacio, notación de arrays de PHP (`foo[]`, `foo[bar]`). El parsing
se delega a `php_default_treat_data(PARSE_STRING, ...)`, la misma función que rellena `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

Un único parámetro por nombre, o `$default` (por defecto `null`) si no está.

## Cabeceras

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

Case-insensitive.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

Un valor, case-insensitive. `null` si no está.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

Todos los valores unidos por coma. Cadena vacía si no está.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

Todas las cabeceras. Nombres en **minúsculas**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

Valor de `Content-Type`, o `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` o `null` (ausente o inválido).

## Cuerpo

### getBody

```php
public HttpRequest::getBody(): string
```

Cuerpo de la solicitud. Cadena vacía si no hay body.

> En el modo body streaming (`HttpServerConfig::setBodyStreamingEnabled(true)`) `getBody()`
> lanza; lee mediante `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Esperar al cuerpo completo. Desde Phase 6 Step 3+ el manejador puede invocarse **justo después
del parsed-headers**, antes de recibir el cuerpo. `awaitBody()` suspende la corrutina hasta el
message-complete.

Cuando el cuerpo ya está íntegramente en el buffer (default actual) regresa de inmediato sin
suspend.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Streaming pull-based del cuerpo (issue #26). Devuelve **un** chunk entregado por el parser por
llamada:

- frame DATA de H2 (≈ 16 KiB);
- slice de `on_body` de llhttp (limitado por el read-buffer de H1 — 8 KiB).

Comportamiento:

- Cola vacía → la corrutina se aparca en el evento-trigger per-request.
- EOF → `null` (idempotente).
- Error de stream (peer reset, superar `max_body_size`) → `\Exception`.
- `$maxLen` está reservado para una futura optimización de coalesce y ahora se ignora. La firma
  se mantiene binariamente compatible con la mejora prevista.

Disponible **solo** con `HttpServerConfig::setBodyStreamingEnabled(true)`.

Véase [Streaming](/es/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

Datos POST de `multipart/form-data` o `application/x-www-form-urlencoded`. Admite arrays estilo
PHP: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

Todos los archivos subidos. Varios archivos con un mismo nombre:
`['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

Un único archivo por nombre. Para `photos[]`, el primero del array. `null` si no está.

Véase [`UploadedFile`](/es/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Requiere `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

`traceparent` crudo tal y como llegó. `null` si está ausente / mal formado / la telemetría está
desactivada.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

`tracestate` crudo. `null` si está ausente / la telemetría está desactivada.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

Trace-id decodificado, 32 caracteres lower-hex, o `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

Parent span-id decodificado, 16 caracteres lower-hex, o `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

Byte de flags decodificado de 8 bits (por ejemplo, `0x01` = sampled), o `null`.

## Ejemplo

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    error_log(sprintf(
        "[%s] %s %s (HTTP/%s, body=%s, traceid=%s)",
        $req->getMethod(),
        $req->getPath(),
        $req->getQuery() ? json_encode($req->getQuery()) : '-',
        $req->getHttpVersion(),
        $req->getContentLength() ?? 'n/a',
        $req->getTraceId() ?? '-'
    ));

    if ($req->getMethod() === 'POST' && $req->getContentType() === 'application/json') {
        $body = json_decode($req->getBody(), true);
        // ...
    }

    $res->json(['ok' => true]);
});
```

## Véase también

- [`TrueAsync\HttpResponse`](/es/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/es/docs/reference/server/uploaded-file.html)
- [Streaming](/es/docs/server/streaming.html)
