---
layout: docs
lang: en
path_key: "/docs/reference/server/http-request.html"
nav_active: docs
permalink: /en/docs/reference/server/http-request.html
page_title: "TrueAsync\\HttpRequest"
description: "TrueAsync\\HttpRequest — read-only HTTP request representation: method, URI, headers, body, query, multipart, W3C Trace Context, body streaming."
---

# TrueAsync\HttpRequest

(PHP 8.6+, true_async_server 0.6+)

Read-only object passed as the first argument to the handler. Created by the server — not
constructed by user code.

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

    // --- headers ---
    public function hasHeader(string $name): bool;
    public function getHeader(string $name): ?string;
    public function getHeaderLine(string $name): string;
    public function getHeaders(): array;
    public function getContentType(): ?string;
    public function getContentLength(): ?int;

    // --- body ---
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

The full request URI — path plus query string.

### getPath

```php
public HttpRequest::getPath(): string
```

The path without the query string. For example, `/search` from `/search?q=hello`. Uniform across
HTTP/1.1, HTTP/2 (`:path` pseudo-header), and HTTP/3. Together with `getQuery()` it uses a single
lazy parse — the URI is split into path/query on first access and cached in the request struct.

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

All query parameters as an associative array — the equivalent of `$_GET`. Supports
percent-decoding, `+`-as-space, and PHP array notation (`foo[]`, `foo[bar]`). Parsing is delegated
to `php_default_treat_data(PARSE_STRING, ...)` — the same function that populates `$_GET`.

### getQueryParam

```php
public HttpRequest::getQueryParam(string $name, mixed $default = null): mixed
```

A single parameter by name, or `$default` (default `null`) when missing.

## Headers

### hasHeader

```php
public HttpRequest::hasHeader(string $name): bool
```

Case-insensitive.

### getHeader

```php
public HttpRequest::getHeader(string $name): ?string
```

A single value, case-insensitive. `null` when missing.

### getHeaderLine

```php
public HttpRequest::getHeaderLine(string $name): string
```

All values, joined with commas. Empty string when missing.

### getHeaders

```php
public HttpRequest::getHeaders(): array
```

All headers. Names are **lowercase**.

### getContentType

```php
public HttpRequest::getContentType(): ?string
```

The value of `Content-Type`, or `null`.

### getContentLength

```php
public HttpRequest::getContentLength(): ?int
```

`Content-Length` or `null` (missing or invalid).

## Body

### getBody

```php
public HttpRequest::getBody(): string
```

The request body. Empty string when there is no body.

> In streaming-body mode (`HttpServerConfig::setBodyStreamingEnabled(true)`) `getBody()` throws —
> read through `readBody()`.

### hasBody

```php
public HttpRequest::hasBody(): bool
```

### awaitBody

```php
public HttpRequest::awaitBody(): static
```

Wait for the full body. Since Phase 6 Step 3+, the handler may be invoked **immediately after the
parsed headers**, before the body is fully received. `awaitBody()` suspends the coroutine until
message-complete.

When the body is already fully buffered (the current default), the call returns immediately
without suspending.

### readBody

```php
public HttpRequest::readBody(int $maxLen = 65536): ?string
```

Pull-based body streaming (issue #26). Returns **one** parser-supplied chunk per call:

- an H2 DATA frame (≈ 16 KiB);
- an llhttp `on_body` slice (bounded by the H1 read buffer of 8 KiB).

Behaviour:

- Empty queue → the coroutine parks on a per-request trigger event.
- EOF → `null` (idempotent).
- Stream error (peer reset, `max_body_size` exceeded) → `\Exception`.
- `$maxLen` is reserved for a future coalesce optimisation and is currently ignored. The signature
  stays binary-compatible with the upcoming polish.

Available **only** when `HttpServerConfig::setBodyStreamingEnabled(true)`.

See [Streaming](/en/docs/server/streaming.html).

## Multipart / form

### getPost

```php
public HttpRequest::getPost(): array
```

POST data from `multipart/form-data` or `application/x-www-form-urlencoded`. Supports PHP-style
arrays: `name[]`, `user[name]`, `matrix[0][1]`.

### getFiles

```php
public HttpRequest::getFiles(): array
```

All uploaded files. Multiple files with the same name:
`['photos' => [UploadedFile, UploadedFile, ...]]`.

### getFile

```php
public HttpRequest::getFile(string $name): ?UploadedFile
```

A single file by name. For `photos[]`, returns the first in the array. `null` when missing.

See [`UploadedFile`](/en/docs/reference/server/uploaded-file.html).

## W3C Trace Context

Requires `HttpServerConfig::setTelemetryEnabled(true)`.

### getTraceParent

```php
public HttpRequest::getTraceParent(): ?string
```

Raw `traceparent` as received. `null` when missing / malformed / telemetry is disabled.

### getTraceState

```php
public HttpRequest::getTraceState(): ?string
```

Raw `tracestate`. `null` when missing / telemetry is disabled.

### getTraceId

```php
public HttpRequest::getTraceId(): ?string
```

The decoded 32-character lower-hex trace id, or `null`.

### getSpanId

```php
public HttpRequest::getSpanId(): ?string
```

The decoded 16-character lower-hex parent span id, or `null`.

### getTraceFlags

```php
public HttpRequest::getTraceFlags(): ?int
```

The decoded 8-bit flags byte (for example, `0x01` — sampled), or `null`.

## Example

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

## See also

- [`TrueAsync\HttpResponse`](/en/docs/reference/server/http-response.html)
- [`TrueAsync\UploadedFile`](/en/docs/reference/server/uploaded-file.html)
- [Streaming](/en/docs/server/streaming.html)
