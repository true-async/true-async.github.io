---
layout: docs
lang: en
path_key: "/docs/server/streaming.html"
nav_active: docs
permalink: /en/docs/server/streaming.html
page_title: "TrueAsync Server: request and response streaming"
description: "readBody(): pull-based request body streaming. send()/sendable(): chunked response streaming with backpressure. HTTP/2 trailers."
---

# Request and response streaming

(PHP 8.6+, true_async_server 0.6+)

## Request body streaming: `readBody()`

By default the handler receives the fully-read body (`HttpRequest::getBody()`).
With `HttpServerConfig::setBodyStreamingEnabled(true)` the H1/H2 parsers push DATA chunks into a
per-request FIFO and the handler reads them one at a time through `HttpRequest::readBody()`.

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

### Semantics

- One `readBody()` call returns **one** parser-supplied chunk:
  - an H2 DATA frame (up to 16 KiB by default),
  - an llhttp `on_body` slice (bounded by the H1 read buffer of 8 KiB).
- When the queue is empty, the coroutine parks on a per-request trigger event.
- EOF returns `null` (idempotent).
- A stream error (peer reset, `max_body_size` exceeded) throws `\Exception`.
- The `$maxLen` parameter is reserved for a future coalesce optimisation and is currently ignored.
  The signature stays binary-compatible with the upcoming polish (issue #26).

### When to enable

- Large uploads (logs, media, backups)
- Streaming parsers (NDJSON, MessagePack stream)
- Services where tail latency degrades from holding the body in RAM
- Multipart is **always** streamed, regardless of `setBodyStreamingEnabled()`

When **not** to enable: REST endpoints where the body is small and `getBody()`/`getPost()`/
`getQuery()` is more convenient. There is no combined mode (stream only when the body exceeds X);
`getBody()` in streaming mode throws `LogicException` (planned on the roadmap).

### Memory footprint

For 50 parallel 20-MiB POSTs (h2load, WSL2): peak RSS drops 1170 MiB → **197 MiB** (×6).
Throughput grows from 36 req/s → **100 req/s** (×2.7) because handler dispatch no longer waits for
the full body.

## Response streaming: `send()` / `sendable()`

The simplest response — via `setBody()` / `json()` / `html()` / `redirect()` — is sent as a single
chunk.

For a streamed response (chunked H1, HTTP/2 DATA frames), use `send($chunk)`:

```php
$server->addHttpHandler(function ($req, $res) {
    $res
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/event-stream')
        ->setHeader('Cache-Control', 'no-store')
        ->setNoCompression();   // SSE: events must reach the client immediately

    // The first send() commits status + headers (they cannot be changed afterwards)
    foreach (generateEvents() as $event) {
        $res->send("data: " . json_encode($event) . "\n\n");
    }
});
```

### Backpressure

`send()` blocks the handler coroutine **only** under backpressure: the per-stream staging buffer
is full. In the normal case it returns immediately.

HTTP/2: backpressure kicks in when the ring slots are full **or** the
`HttpServerConfig::setStreamWriteBufferBytes()` limit is exceeded (default 256 KiB).
HTTP/1 chunked: uses the kernel send buffer.

### `sendable()`

Advisory non-blocking check: returns `true` if `send()` will accept a chunk without suspending the
coroutine. `false` means: `send()` will block, or the response was closed / sealed by `sendFile()`,
or the response type is not streaming-capable.

```php
foreach ($events as $event) {
    if (!$res->sendable()) {
        // we don't want to wait on a slow client — do other work
        $event->save();   // persist to the database
        continue;
    }
    $res->send($event->encode());
}
```

`send()` is **always** safe to call, regardless of `sendable()`. The latter just gives the handler
a chance to do other work instead of blocking on a slow peer.

## HTTP/2 trailers

HTTP/2 supports a HEADERS frame after the body (trailers). The canonical consumer is gRPC
(`grpc-status` as a trailer).

```php
$res->setStatusCode(200);
$res->send($body);
$res->setTrailer('grpc-status', '0');
$res->setTrailer('grpc-message', 'OK');
```

Bulk set:

```php
$res->setTrailers(['grpc-status' => '0', 'grpc-message' => 'OK']);
$res->resetTrailers();   // clear all
$res->getTrailers();
```

On HTTP/1.1 the value is **silently ignored**: chunked-encoding trailer emission is out of scope
for Step 5b.

> Trailer names are written in lowercase (RFC 9113 §8.2.2); uppercase is automatically lowered.

## See also

- [`HttpServerConfig::setBodyStreamingEnabled()`](/en/docs/reference/server/http-server-config.html#setbodystreamingenabled)
- [`HttpServerConfig::setStreamWriteBufferBytes()`](/en/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
- [`HttpRequest::readBody()`](/en/docs/reference/server/http-request.html#readbody)
- [`HttpResponse::send()`](/en/docs/reference/server/http-response.html#send)
- [`HttpResponse::sendable()`](/en/docs/reference/server/http-response.html#sendable)
- [`HttpResponse::setTrailer()`](/en/docs/reference/server/http-response.html#settrailer)
