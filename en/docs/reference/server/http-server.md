---
layout: docs
lang: en
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /en/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer — the main class of the built-in HTTP server. Handler registration, start/stop, telemetry, runtime stats."
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

The main class of the built-in server. Receives a config through its constructor, accepts protocol
handlers, starts via `start()`, and blocks the thread until `stop()`.

```php
namespace TrueAsync;

final class HttpServer
{
    public function __construct(HttpServerConfig $config);

    public function addHttpHandler(callable $handler): static;
    public function addStaticHandler(StaticHandler $handler): static;
    public function addWebSocketHandler(callable $handler): static;
    public function addHttp2Handler(callable $handler): static;       // TODO
    public function addGrpcHandler(callable $handler): static;        // TODO

    public function start(): bool;
    public function stop(): bool;
    public function isRunning(): bool;

    public function getConfig(): HttpServerConfig;
    public function getHttp3Stats(): array;
    public function getRuntimeStats(): array;
    public function getTelemetry(): array;        // TODO
    public function resetTelemetry(): bool;       // TODO
}
```

## Methods

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

Creates the server with the given config. **The config is frozen** by this call — any subsequent
setter throws `HttpServerRuntimeException`.

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

Registers a handler for HTTP/1.1 and HTTP/2 requests. Signature:

```php
function (HttpRequest $request, HttpResponse $response): void
```

Each request runs in its **own coroutine** inside a
[per-request scope](/en/docs/server/workers.html#per-request-scope). The handler returns `void`;
the response is sent through `$response`.

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

Registers a static mount (issue #13). Requests under `$handler->getUrlPrefix()` are served
**entirely in C** — without spawning a coroutine and without entering the PHP VM.

Multiple mounts are matched in registration order. After attach, the handler is **locked** —
any setter on it throws `HttpServerRuntimeException`.

See [`StaticHandler`](/en/docs/reference/server/static-handler.html).

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

Registers a handler for full-duplex WebSocket connections (RFC 6455). Upgrade is accepted from
HTTP/1.1 and from HTTP/2 (RFC 8441 Extended CONNECT), plus `wss://` over TLS and
permessage-deflate (RFC 7692). Each connection is served by its own coroutine.

Two signatures are supported; the server checks how many parameters the handler declares:

```php
function (WebSocket $ws): void
function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade): void
```

The two-parameter form (`$ws` only) accepts the upgrade with default settings. The
three-parameter form gives access to `WebSocketUpgrade`: subprotocol negotiation and the ability
to reject the upgrade before the `101` response goes out.

See the [WebSocket guide](/en/docs/server/websocket.html) and the
[`WebSocket` class reference](/en/docs/reference/server/websocket.html).

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 Planned. Today HTTP/2 requests go through `addHttpHandler` (the shared H1/H2 dispatcher).

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 Planned. Over HTTP/2, unary and streaming RPC.

### start

```php
public HttpServer::start(): bool
```

Starts the server and blocks the calling thread until `stop()` or a fatal error.

- With `setWorkers(1)` — runs the event loop on the calling thread.
- With `setWorkers(N > 1)` — spawns an `Async\ThreadPool` of N workers and `await`s their
  completion.

Returns `true` on a normal shutdown. Throws `HttpServerException` (and its descendants) on start
errors (bind failed, missing build dependencies for HTTP/3 when `addHttp3Listener` was used, etc.).

### stop

```php
public HttpServer::stop(): bool
```

Graceful shutdown:

1. Stops accepting new connections.
2. Waits for active requests to finish (up to `setShutdownTimeout()`).
3. Closes all connections.

Returns `true` on a successful stop.

> Cross-thread `stop()` is on the roadmap. Today shutdown is usually initiated through
> SIGINT/SIGTERM.

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

Returns the **same** config object that was passed into `__construct`. After the server starts,
the config is locked (`isLocked() === true`).

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

Per-listener observability for HTTP/3. One entry per `addHttp3Listener()` in registration order.
Each entry contains:

| Key | Value |
|-----|-------|
| `host` | bound host |
| `port` | UDP port |
| `datagrams_received` | datagrams received counter |
| `bytes_received` | bytes received |
| `datagrams_errored` | datagrams that errored |
| `last_datagram_size` | size of the last datagram |
| `last_peer` | last peer (string) |

Returns an empty array when the extension is built **without** `--enable-http3`.

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

Snapshot of the server's internal allocators. Helps attribute RSS growth to specific subsystems.

| Key | Meaning |
|-----|---------|
| `conn_arena_live` | `http_connection_t` slots currently in use (one per live TCP connection) |
| `conn_arena_slots` | total slots across chunks (live + free, never shrinks) |
| `conn_arena_chunks` | committed chunks; each one is `CONN_ARENA_CHUNK_SLOTS` (256) structs of ~768 B |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` — virtual commitment |
| `body_pool` | per-size-class LIFO of large request bodies (1 MB..128 MB). Each entry: `slot_bytes`, `count`, `bytes` |
| `body_pool_total_bytes` | sum of `bytes` across all classes |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 Planned.

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 Planned.

## Example

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\StaticHandler;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addStaticHandler(
    (new StaticHandler('/assets/', __DIR__ . '/public'))
        ->enablePrecompressed('br', 'gzip')
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['ok' => true, 'path' => $req->getPath()]);
});

$server->start();
```

## See also

- [`TrueAsync\HttpServerConfig`](/en/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/en/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/en/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/en/docs/reference/server/websocket.html)
- [Quickstart](/en/docs/server/quickstart.html)
