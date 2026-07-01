---
layout: docs
lang: en
path_key: "/docs/reference/server/websocket.html"
nav_active: docs
permalink: /en/docs/reference/server/websocket.html
page_title: "TrueAsync\\WebSocket"
description: "TrueAsync\\WebSocket, WebSocketMessage, WebSocketUpgrade, WebSocketCloseCode, and the WebSocket exception hierarchy."
---

# TrueAsync\WebSocket

(PHP 8.6+, true_async_server 0.9+)

The classes behind full-duplex connections over RFC 6455. Guide with examples:
[WebSocket](/en/docs/server/websocket.html).

## TrueAsync\WebSocket

One WebSocket connection. Created by the server right after the upgrade handshake commits and
passed as the first argument to the handler registered through
[`HttpServer::addWebSocketHandler()`](/en/docs/reference/server/http-server.html#addwebsockethandler).

```php
namespace TrueAsync;

final class WebSocket implements \Iterator
{
    public function recv(): ?WebSocketMessage;

    public function send(string $text): void;
    public function sendBinary(string $data): void;
    public function trySend(string $text): bool;
    public function trySendBinary(string $data): bool;

    public function ping(string $payload = ''): void;
    public function close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void;

    public function isClosed(): bool;
    public function getSubprotocol(): ?string;
    public function getRemoteAddress(): string;

    // Iterator
    public function current(): ?WebSocketMessage;
    public function key(): int;
    public function next(): void;
    public function rewind(): void;
    public function valid(): bool;
}
```

Instances are constructed only by the server; `new WebSocket` is not available to user code.

### Lifecycle

The connection is bound to the handler coroutine. When the handler returns control for any
reason, including `return` from a `recv()` loop on `null`, the server closes the connection with
code `1000 Normal`. An explicit `close()` before `return` is only needed for a non-default code
or reason text.

### Concurrency model

- `send()`, `sendBinary()`, and `ping()` are safe to call from any coroutine on the same thread.
  Producers atomically enqueue serialized frames; a single cooperative flusher writes them to the
  socket one at a time, so frames from different callers never interleave.
- `recv()` is single-reader: a second concurrent `recv()` call throws
  `WebSocketConcurrentReadException`, because the connection is one byte stream and there is no
  defined semantics for multiple readers.
- `close()` is idempotent and can be called from any coroutine.

### recv

```php
public WebSocket::recv(): ?WebSocketMessage
```

Receives the next text or binary message. Suspends the calling coroutine until a complete
message arrives or the connection closes.

Returns a [`WebSocketMessage`](#websocketmessage) or `null` when the client closed cleanly: a
normal CLOSE code (`1000`/`1001`/`1005`) or a plain disconnect with no CLOSE frame. Typical loop:
`while (($m = $ws->recv()) !== null) { ... }`.

The method throws:

- `WebSocketClosedException` on a protocol error or an explicit error close code;
  `$closeCode`/`$closeReason` carry the RFC 6455 code and reason.
- `WebSocketConcurrentReadException` if another coroutine is already waiting inside `recv()` on
  this connection.

### send

```php
public WebSocket::send(string $text): void
```

Sends a text frame. `$text` **must** be valid UTF-8: invalid data is rejected up front so the
receiver never sees a frame that violates RFC 6455 §5.6.

Returns control right away in the common case, while the send buffer isn't full. Suspends the
calling coroutine once the buffer fills up, and resumes once the client has read enough to make
room again. If the suspension outlasts `write_timeout_ms`, the method throws
`WebSocketBackpressureException`, and the handler can then drop the message, close the
connection, or retry.

The method also throws `WebSocketClosedException` if the connection is already closed.

### sendBinary

```php
public WebSocket::sendBinary(string $data): void
```

Sends a binary frame. Binary payloads have no UTF-8 constraint. Backpressure behavior is
identical to `send()`.

### trySend

```php
public WebSocket::trySend(string $text): bool
```

Non-blocking send. Queues a text frame and returns `true` when the send buffer isn't full;
returns `false` without queueing anything when the buffer is full, so the caller can drop the
message, slow down, or close the connection. Unlike `send()`, `trySend()` never suspends the
calling coroutine, which makes it the right tool for a broadcast loop where one slow client must
not stall delivery to the others.

The buffer's size is set by
[`HttpServerConfig::setStreamWriteBufferBytes()`](/en/docs/reference/server/http-server-config.html#setstreamwritebufferbytes)
(`0` disables the limit: `trySend()` then always queues the frame and returns `true`).

The function returns `true` if the message was accepted into the queue, and `false` if the send
buffer is full and the client isn't keeping up. Throws `WebSocketClosedException` if the
connection is already closed.

### trySendBinary

```php
public WebSocket::trySendBinary(string $data): bool
```

Non-blocking binary send. Behaves the same as `trySend()`.

### ping

```php
public WebSocket::ping(string $payload = ''): void
```

Sends a PING frame. Per RFC 6455 §5.5.2 the peer is required to reply with PONG. Application
code rarely needs to call this by hand: the server's keepalive timer
(`HttpServerConfig::setWsPingIntervalMs()`) sends pings automatically when configured.

`$payload` accepts up to 125 bytes (RFC 6455 §5.5).

### close

```php
public WebSocket::close(WebSocketCloseCode|int $code = WebSocketCloseCode::NORMAL, string $reason = ''): void
```

Starts the close handshake and tears the connection down. Idempotent: repeated calls are no-ops.

- `$code` is a `WebSocketCloseCode` value, or a raw integer in `4000..4999` (reserved for
  application-specific codes, RFC 6455 §7.4.2).
- `$reason` is UTF-8 text, up to 123 bytes.

### isClosed

```php
public WebSocket::isClosed(): bool
```

`true` after `close()` has been called, or after the client's CLOSE frame has been processed.

### getSubprotocol

```php
public WebSocket::getSubprotocol(): ?string
```

The subprotocol negotiated during the upgrade, or `null` if none was selected.

### getRemoteAddress

```php
public WebSocket::getRemoteAddress(): string
```

The peer address in `host:port` form (IPv4) or `[host]:port` (IPv6) for TCP connections. An
empty string for connections over a Unix socket.

### Iterator

```php
public WebSocket::current(): ?WebSocketMessage
public WebSocket::key(): int
public WebSocket::next(): void
public WebSocket::rewind(): void
public WebSocket::valid(): bool
```

Lets you write `foreach ($ws as $msg)` instead of a manual `recv()` loop. On each step the loop
pulls the next message; a graceful close simply ends the `foreach`, and a close with an error
throws `WebSocketClosedException` straight out of the loop.

## TrueAsync\WebSocketMessage {#websocketmessage}

```php
namespace TrueAsync;

final class WebSocketMessage
{
    public readonly string $data;
    public readonly bool $binary;
}
```

One fully reassembled message, as delivered by `WebSocket::recv()`. Text messages have already
been validated as UTF-8, so you can use `$data` as-is without checking it again.

- **`$data`** — the message payload. For text messages this is a valid UTF-8 string.
- **`$binary`** — `true` if the message was sent as a binary frame, `false` for a text frame.

Instances are constructed only by the server. You get them through `WebSocket::recv()`; there is
no way to construct `new WebSocketMessage` yourself.

## TrueAsync\WebSocketUpgrade

```php
namespace TrueAsync;

final class WebSocketUpgrade
{
    public function reject(int $status, string $reason = ''): void;
    public function setSubprotocol(string $name): void;
    public function getOfferedSubprotocols(): array;
    public function getOfferedExtensions(): array;
}
```

The handle on an in-progress upgrade negotiation. Exists from the moment the handler is invoked
until either `reject()` is called or the handler returns successfully (in which case the server
sends `101` with whatever subprotocol was chosen through `setSubprotocol()`).

Available only to handlers registered with three parameters:

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $u) {
    // ...
});
```

The server checks how many parameters the handler declares; a two-parameter handler skips this
object entirely and the upgrade is accepted with default settings.

Once the handshake commits, any call on this object throws: `Sec-WebSocket-Protocol` is already
on the wire and the subprotocol can no longer change.

### reject

```php
public WebSocketUpgrade::reject(int $status, string $reason = ''): void
```

Rejects the upgrade with the given HTTP status. The `101` response is never sent; the client
gets the chosen status instead, and the connection closes. After `reject()` the handler should
return right away: no further I/O is allowed.

- `$status` — the HTTP status code (must be 4xx or 5xx).
- `$reason` — an optional response body.

### setSubprotocol

```php
public WebSocketUpgrade::setSubprotocol(string $name): void
```

Picks a subprotocol from the list the client offered. The chosen value is echoed back in the
`Sec-WebSocket-Protocol` response header. Must be called before the handler returns and before
`reject()`. The server does not verify that the chosen value was actually in
`getOfferedSubprotocols()`; that's on the handler.

### getOfferedSubprotocols

```php
public WebSocketUpgrade::getOfferedSubprotocols(): array
```

Returns the subprotocols (`string[]`) the client sent in the `Sec-WebSocket-Protocol` header, in
the client's preferred order. An empty array if the client didn't offer any.

### getOfferedExtensions

```php
public WebSocketUpgrade::getOfferedExtensions(): array
```

Returns the extensions (`string[]`) from the `Sec-WebSocket-Extensions` header, in the client's
preferred order. permessage-deflate (RFC 7692, message compression) is negotiated by the server
itself through `HttpServerConfig::setWsPermessageDeflate()`; the rest of the offered values are
informational only. An empty array if the client didn't offer any.

## TrueAsync\WebSocketCloseCode

```php
namespace TrueAsync;

enum WebSocketCloseCode: int
{
    case NORMAL                = 1000;
    case GOING_AWAY            = 1001;
    case PROTOCOL_ERROR        = 1002;
    case UNSUPPORTED_DATA      = 1003;
    case NO_STATUS             = 1005;  // RESERVED
    case ABNORMAL_CLOSURE      = 1006;  // RESERVED
    case INVALID_FRAME_PAYLOAD = 1007;
    case POLICY_VIOLATION      = 1008;
    case MESSAGE_TOO_BIG       = 1009;
    case MANDATORY_EXTENSION   = 1010;
    case INTERNAL_SERVER_ERROR = 1011;
    case TLS_HANDSHAKE         = 1015;  // RESERVED
}
```

The RFC 6455 §7.4.1 close code registry. Application-specific codes (`4000..4999`, RFC 6455
§7.4.2) stay available too: `WebSocket::close()` accepts a raw `int` alongside this enum.

## Exceptions

```
\Exception
  └── TrueAsync\HttpServerException
        └── TrueAsync\WebSocketException
              ├── WebSocketClosedException          // final
              ├── WebSocketBackpressureException    // final
              └── WebSocketConcurrentReadException  // final
```

### TrueAsync\WebSocketException

```php
class WebSocketException extends HttpServerException {}
```

The base exception for all WebSocket errors. Extends the project-wide `HttpServerException`, so
existing catch-all handlers keep working.

### TrueAsync\WebSocketClosedException

```php
final class WebSocketClosedException extends WebSocketException
{
    public readonly int $closeCode;
    public readonly string $closeReason;
}
```

The connection was closed for a reason other than a normal handshake initiated by the client:
a protocol error, or an explicit error code from the client. `$closeCode` carries the RFC 6455
close code (or `1006 Abnormal Closure` if no CLOSE frame arrived at all, for example on a
network drop). `$closeReason` carries the UTF-8 reason text from the client's CLOSE frame, or an
empty string if none was given.

A clean close by the client (code `1000`) does not throw: `WebSocket::recv()` simply returns
`null` in that case.

### TrueAsync\WebSocketBackpressureException

```php
final class WebSocketBackpressureException extends WebSocketException {}
```

Thrown from `send()`/`sendBinary()` when the send buffer stays full longer than
`write_timeout_ms`. This is the application's signal that the client is reading too slowly:
close the connection, or drop the message and continue.

### TrueAsync\WebSocketConcurrentReadException

```php
final class WebSocketConcurrentReadException extends WebSocketException {}
```

A programmer error: a second coroutine called `recv()` while another was already waiting inside
`recv()` on the same `WebSocket`. A single connection can only be read from one place at a time;
if you need to distribute messages to several handlers, build one `recv()` loop and dispatch the
messages yourself from there.

## See also

- [Guide: WebSocket](/en/docs/server/websocket.html)
- [`HttpServer::addWebSocketHandler()`](/en/docs/reference/server/http-server.html#addwebsockethandler)
- [`HttpServerConfig`: WebSocket options](/en/docs/reference/server/http-server-config.html#websocket)
- [TrueAsync Server exceptions](/en/docs/reference/server/exceptions.html)
