---
layout: docs
lang: en
path_key: "/docs/server/sse.html"
nav_active: docs
permalink: /en/docs/server/sse.html
page_title: "TrueAsync Server: Server-Sent Events"
description: "sseStart()/sseEvent()/sseComment()/sseRetry(): ready-made text/event-stream helpers over HTTP/1.1, HTTP/2, and HTTP/3."
---

# Server-Sent Events

(PHP 8.6+, true_async_server 0.8+)

SSE (Server-Sent Events) is a simple way to stream text events to the browser over a regular
HTTP connection, one direction only: from the server to the browser. Unlike WebSocket, it needs
no separate protocol and no Upgrade handshake: the server just keeps the response open and
appends new events as they become ready. The browser consumes them with the built-in
`EventSource` API, no extra libraries required.

`HttpResponse` gives you four methods for `text/event-stream`: `sseStart()`, `sseEvent()`,
`sseComment()`, and `sseRetry()`. This is a thin formatting layer on top of the same
[`send()` pipeline](/en/docs/server/streaming.html), so the same handler works unchanged over
HTTP/1.1, HTTP/2, and HTTP/3, and the protocol is chosen by the client.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\delay;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWriteTimeout(0);   // long-lived stream: no write deadline

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) {
    $res->sseStart();          // optional: the first sseEvent()/sseComment() starts the stream too
    $res->sseRetry(3000);      // hint the browser to reconnect after 3s on drop
    $res->sseComment('stream open');   // heartbeat, keeps proxies from idling the connection out

    for ($i = 1; $i <= 10; $i++) {
        $res->sseEvent(
            data:  json_encode(['n' => $i, 'at' => time()]),
            event: 'tick',
            id:    (string) $i,
        );

        if (!$res->sendable()) {   // client is gone, no point waiting
            break;
        }

        delay(1000);
    }

    $res->sseEvent('bye');
    $res->end();
});

$server->start();
```

Browser side:

```js
const es = new EventSource('/events');
es.onmessage = e => console.log('message', e.data);
es.addEventListener('tick', e => console.log('tick', e.data, e.lastEventId));
```

## sseStart()

Switches the response into SSE mode and locks in the headers: `Content-Type:
text/event-stream`, `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no` (the
last one tells nginx not to buffer the response; without it, events stall behind the proxy
buffer until it fills up). The response is also marked non-compressible: a buffering gzip stream
would defeat the point of real-time delivery.

The call is optional: the first `sseEvent()`/`sseComment()` starts the stream on its own. But
`sseStart()` by itself does **not** flush the status line and headers onto the wire, the commit
is lazy and happens on the first real event. To open the stream right away (for example, to
unblock the browser's `onopen` before any real event is ready), send an empty `sseComment()`:
that both starts the stream and commits the headers immediately.

Throws `HttpServerInvalidArgumentException` if the handler already set its own `Content-Type`,
and `HttpServerRuntimeException` if the response is already streaming, closed, or busy with
`sendFile()`.

## sseEvent()

```php
$res->sseEvent(
    ?string $data = null,
    ?string $event = null,
    ?string $id = null,
    ?int $retry = null,
): static
```

Formats and sends one SSE event, starting the stream if needed. Multiline `$data` is split on
`\n` / `\r\n` / `\r` and sent as multiple `data:` fields (WHATWG §9.2). `$event`, `$id`, and
`$retry` are included only when not `null`. The record ends with a blank line so the browser
dispatches the event right away.

- `$event` and `$id` must not contain `\r`/`\n` (otherwise the parser would read them as a
  field/record separator), and `$id` must not contain NUL (per WHATWG, a NUL makes the parser
  ignore the whole id): violations throw `HttpServerInvalidArgumentException`.
- `$retry` must be non-negative.
- An empty string `$data === ''` is valid too, it dispatches an empty `MessageEvent`.
- All four arguments set to `null` is a no-op. The `EventSource` parser silently skips an event
  with neither `data` nor `retry`.

## sseComment()

```php
$res->sseComment(string $text = ''): static
```

Sends a comment line (a record starting with `:`). Browsers ignore comments, but they keep the
connection alive through the idle timeouts of intermediate proxies (nginx's
`proxy_read_timeout`, 60s by default). Call it periodically as a heartbeat. The canonical
payload is an empty string, which becomes `:\n\n` on the wire. `$text` must not contain `\r`/`\n`.

## sseRetry()

```php
$res->sseRetry(int $milliseconds): static
```

Sends a `retry:` directive telling the browser how many milliseconds to wait before
reconnecting after the stream drops. Sugar for `sseEvent(retry: $milliseconds)` with no payload.

## Backpressure: `sendable()`

Like `send()`, every SSE method suspends the handler coroutine only under real backpressure,
that is, when the stream's intermediate buffer is full. The `sendable()` check is non-blocking
and advisory: `false` means the next call would suspend, the response is already closed, or this
response type does not support streaming at all. Handy so you don't have to wait on a slow
client when there is other work to do.

## See also

- [`HttpResponse::sseStart()`](/en/docs/reference/server/http-response.html#ssestart) and the
  other SSE methods in the reference
- [Streaming](/en/docs/server/streaming.html): the low-level `send()`/`sendable()` that SSE is
  built on
- [Examples](/en/docs/server/examples.html#sse-server-sent-events)
