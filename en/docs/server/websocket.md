---
layout: docs
lang: en
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /en/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex connections over RFC 6455, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
---

# WebSocket

(PHP 8.6+, true_async_server 0.9+)

`HttpServer::addWebSocketHandler()` registers a handler for full-duplex connections over
RFC 6455.

A connection starts as a plain HTTP request, and then the client asks the server to switch it
to a different protocol on that same TCP connection: that's what an Upgrade is. The server
replies with status `101 Switching Protocols`, and from that point on the same connection
carries WebSocket, not HTTP. Supported:

- Upgrade from HTTP/1.1 (the classic `Connection: Upgrade` header).
- Upgrade from HTTP/2 (RFC 8441 Extended CONNECT).
- `wss://` (WebSocket over TLS).
- permessage-deflate (RFC 7692), message-level compression.

> The implementation is verified against the Autobahn|Testsuite conformance suite and passes
> all 246 tests in the `behavior` category.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\WebSocket;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addWebSocketHandler(function (WebSocket $ws) {
    foreach ($ws as $msg) {
        $ws->send('echo: ' . $msg->data);
    }
});

$server->start();
```

Each connection is served by its own coroutine, the same per-request model as HTTP.

## Lifecycle

A connection stays open until the handler coroutine returns. If the handler simply finishes
(for example, the `recv()`/`foreach` loop got `null` at the end), the server closes the
connection with code `1000 Normal` automatically. An explicit `close()` before `return` is only
needed when you want a different code or your own reason text.

## Receiving messages: `recv()` and `foreach`

```php
public WebSocket::recv(): ?WebSocketMessage
```

Suspends the coroutine until the next message arrives or the connection closes. Returns a
[`WebSocketMessage`](/en/docs/reference/server/websocket.html#websocketmessage) or `null` when
the client closed the connection cleanly (a normal close code, or a disconnect with no explicit
CLOSE frame):

```php
while (($msg = $ws->recv()) !== null) {
    handle($msg->data, $msg->binary);
}
```

`WebSocket` implements `\Iterator`, so the same loop can be written more concisely as
`foreach ($ws as $msg) { ... }`. A clean close simply ends the `foreach`; a close with an error
throws `WebSocketClosedException` straight out of the loop.

Read messages from one place only: if you call `recv()` from two coroutines in parallel on the
same connection, the second call throws `WebSocketConcurrentReadException`. If you need to
distribute messages to several handlers, keep one `recv()` loop and dispatch from it yourself.

## Sending messages: `send()`, `trySend()`

`send()` and `sendBinary()` are safe to call from any coroutine, including several at once: the
server makes sure data from different calls never gets mixed up on the wire.

```php
$ws->send('text frame');       // text MUST be valid UTF-8
$ws->sendBinary($binaryData);  // binary data has no encoding constraint
```

Usually these functions return right away. If the client is reading slowly and the send buffer
fills up, the coroutine suspends and resumes once the client drains some of the buffer. If the
wait drags on longer than `write_timeout_ms`, a `WebSocketBackpressureException` is thrown, and
the handler decides what to do: drop the message, close the connection, or retry.

For broadcasting a message to many clients, where one slow client should not hold up the
others, there are non-blocking variants:

```php
if (!$ws->trySend($text)) {
    // this client's buffer is full, the message was NOT sent, the client is falling behind
}
```

`trySend()`/`trySendBinary()` never suspend the coroutine: they return `true` right away if the
message was accepted, and `false` if the buffer is full (in which case the message is simply not
sent). The buffer's size is set by
[`HttpServerConfig::setStreamWriteBufferBytes()`](/en/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` disables the limit: `trySend()` always sends and returns `true`).

## Closing a connection: `close()`, `isClosed()`

```php
$ws->close(WebSocketCloseCode::NORMAL, 'bye');
```

Starts closing the connection. Safe to call more than once: later calls are no-ops. The close
code is a [`WebSocketCloseCode`](/en/docs/reference/server/websocket.html#websocketclosecode)
value or an integer in the `4000..4999` range (reserved for application-specific codes).
`$reason` takes UTF-8 text, up to 123 bytes.

`isClosed()` returns `true` after `close()`, or after the client sends its own close signal.

## Ping and keepalive

```php
$ws->ping('optional payload');   // up to 125 bytes, RFC 6455 §5.5
```

Application code rarely needs to call this by hand: the server's keepalive timer
(`HttpServerConfig::setWsPingIntervalMs()`) sends PINGs automatically. If the client doesn't
reply in time (`setWsPongTimeoutMs()`), the server closes the connection on its own. See
[Configuration](/en/docs/server/configuration.html#websocket) for the details.

## Subprotocol negotiation and rejection: `WebSocketUpgrade`

By default the handler only receives `WebSocket $ws`. To decide for yourself whether to accept
the connection and which subprotocol to pick, register the handler with three parameters: the
server detects the parameter count and, in that case, passes a third object, `WebSocketUpgrade`:

```php
use TrueAsync\WebSocket;
use TrueAsync\HttpRequest;
use TrueAsync\WebSocketUpgrade;

$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    $offered = $u->getOfferedSubprotocols();   // from the Sec-WebSocket-Protocol header

    if (!in_array('chat.v2', $offered, true)) {
        $u->reject(400, 'unsupported subprotocol');
        return;
    }

    $u->setSubprotocol('chat.v2');   // must be called before return or reject()

    foreach ($ws as $msg) {
        // ...
    }
});
```

`WebSocketUpgrade` lives from the moment the handler is called until `reject()` or a successful
`return` (at which point the server finishes the handshake with the chosen subprotocol). After
that, any call on this object throws: the reply is already on the wire and the subprotocol can
no longer change.

`getOfferedExtensions()` returns the list of extensions the client offered. permessage-deflate
(RFC 7692, message compression) is negotiated by the server itself through
`HttpServerConfig::setWsPermessageDeflate()`; the rest of the offered values are informational
only.

## Close codes and exceptions

`WebSocketCloseCode` is an enum with the standard RFC 6455 close codes (`NORMAL`, `GOING_AWAY`,
`PROTOCOL_ERROR`, `MESSAGE_TOO_BIG`, and others). The exception hierarchy:

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // client isn't reading fast enough
              └── WebSocketConcurrentReadException  // second recv() in parallel
```

A clean close by the client shows up as `null` from `recv()`, not as an exception. An exception
is only thrown on a protocol error or a close with an explicit error code; `$closeCode`/
`$closeReason` carry the reason. See the
[reference](/en/docs/reference/server/websocket.html) for details.

## Configuration

| Method | Default | Purpose |
|--------|---------|---------|
| `setWsMaxMessageSize($bytes)` | 1 MiB | max reassembled message size, otherwise `1009` |
| `setWsMaxFrameSize($bytes)` | 1 MiB | max size of a single frame, guards against a flood of tiny fragments |
| `setWsPingIntervalMs($ms)` | 30000 | how often the server pings an idle connection, `0` disables it |
| `setWsPongTimeoutMs($ms)` | 60000 | how long to wait for PONG before closing (`1001`) |
| `setWsPermessageDeflate($bool)` | `false` | RFC 7692, opt-in because of its CPU cost |

See [Configuration](/en/docs/server/configuration.html#websocket) for more detail.

## See also

- [`TrueAsync\WebSocket` and related classes](/en/docs/reference/server/websocket.html): the
  full reference
- [`HttpServer::addWebSocketHandler()`](/en/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuration: WebSocket](/en/docs/server/configuration.html#websocket)
