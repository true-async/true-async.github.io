---
layout: docs
lang: en
path_key: "/docs/reference/server/http-response.html"
nav_active: docs
permalink: /en/docs/reference/server/http-response.html
page_title: "TrueAsync\\HttpResponse"
description: "TrueAsync\\HttpResponse — status, headers, body, streaming via send()/sendable(), HTTP/2 trailers, sendFile(), json(), html(), redirect()."
---

# TrueAsync\HttpResponse

(PHP 8.6+, true_async_server 0.6+)

Response object with a fluent interface. Passed as the second argument to the handler. Created by
the server — not constructed by user code.

```php
namespace TrueAsync;

final class HttpResponse
{
    // status
    public function setStatusCode(int $code): static;
    public function getStatusCode(): int;
    public function setReasonPhrase(string $phrase): static;
    public function getReasonPhrase(): string;

    // headers
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

    // protocol introspection
    public function getProtocolName(): string;
    public function getProtocolVersion(): string;

    // body
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

    // send / state
    public function end(?string $data = null): void;
    public function sendFile(string $path, ?SendFileOptions $options = null): void;

    // Server-Sent Events (text/event-stream)
    public function sseStart(): static;
    public function sseEvent(?string $data = null, ?string $event = null, ?string $id = null, ?int $retry = null): static;
    public function sseComment(string $text = ""): static;
    public function sseRetry(int $milliseconds): static;

    public function isHeadersSent(): bool;
    public function isClosed(): bool;
}
```

## Status

### setStatusCode

```php
public HttpResponse::setStatusCode(int $code): static
```

HTTP code, 100..599.

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

## Headers

### setHeader

```php
public HttpResponse::setHeader(string $name, string|array $value): static
```

Set a header, replacing previous values.

### addHeader

```php
public HttpResponse::addHeader(string $name, string|array $value): static
```

Append a value to the existing ones (for example, `Set-Cookie`).

### hasHeader / getHeader / getHeaderLine / getHeaders

```php
public HttpResponse::hasHeader(string $name): bool
public HttpResponse::getHeader(string $name): ?string
public HttpResponse::getHeaderLine(string $name): string
public HttpResponse::getHeaders(): array
```

Case-insensitive read-back of what the handler set.

### resetHeaders

```php
public HttpResponse::resetHeaders(): static
```

Clear all headers.

## Trailers (HTTP/2)

A HEADERS frame sent after the body. The canonical consumer is gRPC (`grpc-status`).
**On HTTP/1.1 the value is silently ignored** — chunked-encoding trailer emission is out of scope
for Step 5b.

### setTrailer

```php
public HttpResponse::setTrailer(string $name, string $value): static
```

The name is lowercase (RFC 9113 §8.2.2); uppercase is automatically lowered.

### setTrailers

```php
public HttpResponse::setTrailers(array $trailers): static
```

Bulk set. Existing trailers are preserved — call `resetTrailers()` first for a clean slate.

### resetTrailers

```php
public HttpResponse::resetTrailers(): static
```

### getTrailers

```php
public HttpResponse::getTrailers(): array
```

## Protocol

### getProtocolName / getProtocolVersion

```php
public HttpResponse::getProtocolName(): string     // always "HTTP"
public HttpResponse::getProtocolVersion(): string  // "1.1", "2", "3"
```

## Body

### write

```php
public HttpResponse::write(string $data): static
```

Append to the internal body buffer. Send happens on `end()` / automatically when the handler
returns.

### send

```php
public HttpResponse::send(string $chunk): static
```

Send a chunk to the client (streaming).

- The **first** `send()` commits status + headers — they can no longer be changed.
- Subsequent calls append HTTP/2 DATA frames or HTTP/1 chunked segments.
- Blocks the handler coroutine **only** under backpressure (per-stream staging buffer full).
  Default backpressure threshold: `setStreamWriteBufferBytes()` — 256 KiB.
- In the normal case returns immediately.

### sendable

```php
public HttpResponse::sendable(): bool
```

Advisory non-blocking check:

- `true` — `send()` will accept a chunk without suspending the coroutine.
- `false` — `send()` will block on backpressure, or the response is already sealed by `sendFile()`
  / closed, or the response type is not streaming-capable.

`send()` is **always** safe to call — `sendable()` simply gives the handler a chance to do other
work instead of blocking on a slow peer.

### setNoCompression

```php
public HttpResponse::setNoCompression(): static
```

Disable compression for this response — overrides Accept-Encoding, the MIME whitelist, and the
size threshold. Use it for: BREACH-sensitive endpoints (secrets + reflected user input), payloads
where `Content-Encoding` is already set, and bodies the server must not re-wrap. Idempotent.

### getBody / setBody

```php
public HttpResponse::getBody(): string
public HttpResponse::setBody(string $body): static
```

Get/set the current buffer contents.

## Helpers

### json

```php
public HttpResponse::json(
    array|string|object|null|int|float|bool $data,
    int $status = 200,
    int $flags  = 0
): static
```

JSON serialisation via `php_json_encode_ex` (the same path used by `json_encode()`):

- `array` / `object` / scalar `$data` → encoded.
- `string` `$data` → sent **as is** (cached JSON, pre-built bytes). Skip re-encoding.

`Content-Type: application/json` is set **only** when the handler did not set one already — chain
`setHeader('Content-Type', 'application/problem+json')->json($payload)` for a different media
type.

`$flags` — a `JSON_*` bitmask. `0` — the server defaults from
[`HttpServerConfig::setJsonEncodeFlags()`](/en/docs/reference/server/http-server-config.html#setjsonencodeflags-getjsonencodeflags)
(`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` out of the box).

`JSON_THROW_ON_ERROR` is silently stripped: an encode error produces a `500` JSON error and the
exception is not propagated. Handlers should never wrap `json()` in try/catch.

### html

```php
public HttpResponse::html(string $html): static
```

Sets `Content-Type: text/html`.

### redirect

```php
public HttpResponse::redirect(string $url, int $status = 302): static
```

## Send

### end

```php
public HttpResponse::end(?string $data = null): void
```

Finalise the response and send it to the client. After `end()` no more writes are allowed.

### sendFile

```php
public HttpResponse::sendFile(string $path, ?SendFileOptions $options = null): void
```

Handler-driven file delivery. Records the path + options on the response and **returns
immediately** — the transfer happens in the dispose phase through the same FSM as `StaticHandler`
(MIME, ETag, IMF-date, Range, conditional GET, precompressed sidecars).

**After `sendFile()` the response is sealed**: `setHeader` / `setStatus*` / `write` / `send` /
`setBody` / `json` / `html` / `redirect` / `end` / a repeat `sendFile()` all throw
`HttpServerRuntimeException`.

The path is **trusted** (the handler made the access decision). open/fstat errors (`ENOENT`,
`EACCES`, oversize, non-regular) produce a 500, because the headers are not on the wire yet.

The compression middleware is bypassed for sendFile bodies (it has its own delivery pipeline).

> The HTTP/3 path for `sendFile()` is still in progress; for now the H3 dispose hook rejects with
> 500.

See [`SendFileOptions`](/en/docs/reference/server/send-file-options.html).

## Server-Sent Events (text/event-stream)

(true_async_server 0.8+). Guide with examples: [SSE](/en/docs/server/sse.html).

### sseStart

```php
public HttpResponse::sseStart(): static
```

Switches the response into SSE mode and locks in the headers: `Content-Type:
text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, and marks
the response non-compressible. The response enters streaming mode the same way the first
`send()` would: the status and headers are committed and can no longer change, but the event
payload itself isn't on the wire yet.

The call is optional: the first `sseEvent()`/`sseComment()` starts the stream on its own.
`sseStart()` by itself does **not** flush the status line and headers: the commit is lazy and
happens on the first `sseEvent()`/`sseComment()`/`sseRetry()` (if none is ever called, an empty
`200 text/event-stream` is flushed when the response ends). To open the stream right away, for
example to unblock the browser's `onopen` before any real event is ready, send an initial
`sseComment()`.

Throws `HttpServerInvalidArgumentException` if the handler already set a `Content-Type` other
than `text/event-stream`, and `HttpServerRuntimeException` if the response is already streaming,
closed, or busy with `sendFile()`.

### sseEvent

```php
public HttpResponse::sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null
): static
```

Formats and sends one SSE event, starting the stream if needed. Multiline `$data` is split on
`\n`/`\r\n`/`\r` and sent as multiple `data:` fields (WHATWG §9.2). `$event`, `$id`, and `$retry`
are included only when not `null`. The record ends with a blank line so the browser dispatches
the event immediately.

`$event` and `$id` must not contain `\r`/`\n` (otherwise the parser would read them as a
field/record separator), and `$id` must not contain NUL: violations throw
`HttpServerInvalidArgumentException`. `$retry` must be non-negative.

`$data === ""` is a valid value too, it dispatches an empty `MessageEvent`. All four arguments
set to `null` is a no-op; the `EventSource` parser skips an event with neither `data` nor
`retry`.

### sseComment

```php
public HttpResponse::sseComment(string $text = ""): static
```

Sends a comment line (a record starting with `:`). Browsers ignore comments, but they keep the
connection alive through the idle timeouts of intermediate proxies (nginx's
`proxy_read_timeout`, 60s by default). The canonical payload is an empty string (`:\n\n` on the
wire). `$text` must not contain `\r`/`\n`. Starts the stream if it isn't running yet.

### sseRetry

```php
public HttpResponse::sseRetry(int $milliseconds): static
```

Sends a bare `retry:` directive telling the browser how many milliseconds to wait before
reconnecting after the stream drops. Sugar for `sseEvent(retry: $milliseconds)` with no payload.
Starts the stream if it isn't running yet.

## State

### isHeadersSent

```php
public HttpResponse::isHeadersSent(): bool
```

### isClosed

```php
public HttpResponse::isClosed(): bool
```

## Example

```php
use TrueAsync\HttpResponse;
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function ($req, HttpResponse $res) {
    // SSE
    if ($req->getPath() === '/events') {
        foreach (loadEvents() as $event) {
            $res->sseEvent(json_encode($event));
        }
        $res->end();
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

## See also

- [`TrueAsync\HttpRequest`](/en/docs/reference/server/http-request.html)
- [`TrueAsync\SendFileOptions`](/en/docs/reference/server/send-file-options.html)
- [SSE](/en/docs/server/sse.html)
- [Streaming](/en/docs/server/streaming.html)
- [Compression](/en/docs/server/compression.html)
