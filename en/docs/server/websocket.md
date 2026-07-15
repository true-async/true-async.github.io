---
layout: docs
lang: en
path_key: "/docs/server/websocket.html"
nav_active: docs
permalink: /en/docs/server/websocket.html
page_title: "TrueAsync Server: WebSocket"
description: "addWebSocketHandler(): full-duplex connections over RFC 6455, cross-worker pub/sub topics, backpressure, keepalive, subprotocol negotiation, permessage-deflate."
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
- [Pub/sub topics](#topics-publishsubscribe-across-every-worker) that reach every worker
  of the process, so a chat does not need a single-worker server or an external broker.

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

// Required: the server refuses to start without an HTTP handler, and this is
// what answers the requests that are not upgrades.
$server->addHttpHandler(function ($req, $res) {
    $res->setStatusCode(404)->end();
});

$server->start();
```

Registering the handler is what turns WebSocket on — there is no separate switch to
flip, exactly like HTTP/2 and `addHttp2Handler()`.

> `HttpServerConfig::enableWebSocket()` is a legacy toggle, not that switch. Passing it
> `true` throws `HttpServerRuntimeException` pointing you at `addWebSocketHandler()` —
> register the handler instead.

Each connection is served by its own coroutine, the same per-request model as HTTP.
A handler that throws does not take the worker down with it: the exception is logged,
and the peer is told in-protocol — an HTTP status if the throw beat the upgrade, a
`CLOSE 1011` once the session was live.

The handler is always called with three arguments, and PHP drops the ones you did not
declare — so `function (WebSocket $ws)`, `function (WebSocket $ws, HttpRequest $req)`
and the three-parameter form are all valid. Declare only what you use.

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

## Topics: publish/subscribe across every worker

A worker is a thread with its own PHP context. So the obvious way to build a chat —
keep an array of connections and loop over it — can only ever reach the peers of *one*
worker, which is why such a chat had to run on `setWorkers(1)`.

Topics fix that. They live in the server, not in your handler: each worker indexes the
connections it owns, and a `publish()` is handed to every worker, which then delivers
to its own sockets. No Redis, no message broker, no single-worker server.

```php
$server->addWebSocketHandler(function (WebSocket $ws, HttpRequest $req) {
    $room = ltrim($req->getPath(), '/') ?: 'lobby';

    $ws->subscribe("chat/$room");

    foreach ($ws as $msg) {
        $ws->publish("chat/$room", $msg->data);   // reaches subscribers on ALL workers
    }
});
```

A topic is addressed by **name, at the call site**. There is no topic object to obtain,
hold, or pass into a handler.

### Filters follow MQTT

Levels are separated by `/`, `+` matches exactly one level, and a trailing `#` matches
the rest:

| Filter | Receives |
|--------|----------|
| `chat/general` | exactly that topic |
| `chat/+/typing` | `chat/general/typing`, `chat/random/typing` — one level, any value |
| `user/42/#` | `user/42`, `user/42/presence`, `user/42/dm/7` — the whole subtree |

Wildcards belong to *subscriptions*. A **publish topic must be concrete**: a message
fanned out to a pattern has no well-defined destination, so `publish('chat/+/typing', …)`
throws `WebSocketException`. Filters may be up to 128 levels deep.

### The API

```php
$ws->subscribe('chat/+/typing');            // idempotent
$ws->unsubscribe('chat/+/typing');          // idempotent
$ws->getTopics();                           // string[] — this connection's filters

$ws->publish('chat/general', $text);        // text, to every worker
$ws->publishBinary('chat/general', $bytes); // binary counterpart

$ws->subscriberCount('chat/general');       // across all workers, wildcards included
```

`publish()` **never suspends**. A peer whose outbound queue is backed up drops the
message rather than stalling delivery to the rest of the topic — the same semantics as
`trySend()`. When you need a delivery guarantee, `send()` to the one connection instead.
A subscriber matched by several of its own filters still receives exactly one copy.

`$excludeSelf` defaults to `true` — the "everyone but the sender" case a chat wants:

```php
$ws->publish('chat/general', $msg->data);                      // sender does not get it back
$ws->publish('chat/general', $msg->data, excludeSelf: false);  // sender gets it too
```

The return value is the number of subscribers served **on the calling worker only**.
Delivery to the other workers is asynchronous and cannot be counted at the call site, so
this is a local number, not a process-wide one. `subscriberCount()` is the process-wide
one — but since each worker answers with its own count and the answers are summed, it is
a snapshot rather than a live counter, and a worker that does not answer in time is left
out.

A closing connection unsubscribes from everything by itself.

### Limits

Both are off by default, which is what every self-hosted broker ships (EMQX
`max_subscriptions` / `messages_rate`, NATS `max_subs`): only the application knows how
many topics it needs.

```php
$config
    ->setWsMaxSubscriptions(32)          // distinct filters one connection may hold
    ->setWsPublishRateLimit(50, burst: 100);
```

Set `setWsMaxSubscriptions()` whenever client input reaches `subscribe()` — say
`$ws->subscribe($msg->data)` — so a peer cannot grow the worker's topic tree without end.
Over the cap, `subscribe()` throws `WebSocketException` and the connection stays up.

`setWsPublishRateLimit()` is a per-connection token bucket. `publish()` is the one
WebSocket call an unprivileged peer can turn into work on *every* worker in the process —
`send()` and `trySend()` only ever touch its own socket. Unmetered, one client looping on
a relayed message fills every worker's inbox, and the drops that follow take out *other*
topics' traffic too. Over the rate, `publish()` throws `WebSocketBackpressureException`
and the connection stays up: the sender is told, rather than the message vanishing into a
full mailbox where nobody can see it.

`$burst` is the bucket depth in messages — how far a handler may run ahead of the
sustained rate. `0` means one second's worth.

```php
try {
    $ws->publish("chat/$room", $msg->data);
} catch (WebSocketBackpressureException) {
    $ws->send('you are sending too fast');
} catch (WebSocketException $e) {
    $ws->send('bad topic: ' . $e->getMessage());
}
```

### What it costs

Each worker summarises its subscriptions in a counting Bloom filter of topic prefixes,
and a publisher skips the workers that provably hold no subscriber instead of waking all
of them. A publish to a topic nobody in the process listens to costs zero cross-worker
wake-ups. `HttpServer::getRuntimeStats()` reports the outcome — `ws_topic_posted`,
`ws_topic_skipped` (the filter earning its keep) and `ws_topic_dropped` (a worker's
mailbox was full: that one is data loss).

Topics work on every WebSocket transport, not just plaintext HTTP/1 — over TLS, over
HTTP/2 Extended CONNECT, and with permessage-deflate, where one `publish()` serves a
compressed peer and a plain one side by side, each with the framing it negotiated.

## The client's address

```php
$ws->getRemoteAddress();   // "203.0.113.7" or "2001:db8::1" — bare IP, no port
$ws->getRemotePort();      // 54321
```

`getRemoteAddress()` returns the **bare IP**: no port, and no brackets around an IPv6
literal — the same shape as `$_SERVER['REMOTE_ADDR']`, so it feeds straight into
`filter_var(…, FILTER_VALIDATE_IP)`, an ACL, or a rate limiter. Both return `null` on a
Unix-socket listener, which has no IP peer.

This is the peer of the TCP connection. It is **not** derived from `X-Forwarded-For` —
behind a proxy, parse that header yourself, and only when you trust the proxy that set it.

> **Breaking change.** `getRemoteAddress()` used to return `"host:port"` (and `""` when
> there was no IP peer). It now returns the bare IP, and `null`. Use `getRemotePort()`
> for the port.

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
        └── TrueAsync\WebSocketException            // also: bad topic filter, subscription cap
              ├── WebSocketClosedException          // closeCode / closeReason
              ├── WebSocketBackpressureException    // slow reader — or publish() over its rate limit
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
| `setWsMaxSubscriptions($count)` | `0` (no limit) | distinct topic filters one connection may hold |
| `setWsPublishRateLimit($perSecond, $burst)` | `0` (off) | per-connection token bucket over `publish()` |

See [Configuration](/en/docs/server/configuration.html#websocket) for more detail.

## See also

- [`TrueAsync\WebSocket` and related classes](/en/docs/reference/server/websocket.html): the
  full reference
- [`HttpServer::addWebSocketHandler()`](/en/docs/reference/server/http-server.html#addwebsockethandler)
- [Configuration: WebSocket](/en/docs/server/configuration.html#websocket)
