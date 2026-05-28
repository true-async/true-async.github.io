---
layout: docs
lang: en
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /en/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server — a native PHP extension that turns PHP into a high-performance HTTP/1.1/2/3 server. Multi-protocol, TLS 1.2/1.3, compression, coroutines — all in one process."
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** is a native PHP extension that runs a high-performance HTTP server
**directly inside the PHP process**. No separate daemon, no reverse-proxy, no FastCGI bridge.

Out of the box it supports **HTTP/1.1 and HTTP/2 on the same TCP port**. Protocol selection
happens via ALPN negotiation (for TLS) or HTTP Upgrade. HTTP/3 runs on the same UDP port
(QUIC) and is advertised to clients through the `Alt-Svc` header.

WebSocket, SSE, and gRPC are already designed around the same single-listener-with-protocol-detect
model, but are still in progress (see [Roadmap](#features)).

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

## Why

**The goal of the server is to unlock the potential of concurrent PHP applications.**

TrueAsync gave the language real coroutines, non-blocking I/O, and connection pools. To turn that
potential into production throughput, you need a server that is designed for the model from the
start: a long-running process with an event loop, where every request gets its own coroutine and
the scheduler switches between them on every I/O wait.

TrueAsync Server is that server. There is no layer between coroutines and the network: listener,
protocol parser, request dispatcher, and handler all live in one process and one event loop.
Database connections are reused through `Async\Pool`, opcache stays hot between requests, and the
cold-start cost is paid once, at `start()`.

## Features

| Status | Feature | Details |
|--------|---------|---------|
| ✅ | **HTTP/1.1** | Full RFC 9112 compliance, keep-alive, pipelining (via [llhttp](https://github.com/nodejs/llhttp) — the same parser Node.js uses) |
| ✅ | **HTTP/2** | Multiplexing, server push (libnghttp2 ≥ 1.57, floor for CVE-2023-44487) |
| ✅ | **HTTP/3 / QUIC** | UDP transport on libngtcp2 + libnghttp3, OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x, ALPN negotiation, weak ciphers disabled |
| ✅ | **Compression** | gzip (zlib-ng / zlib), Brotli, zstd: for responses and inbound body decoding across all protocols |
| ✅ | **Multipart / file uploads** | Streaming zero-copy parser |
| ✅ | **Backpressure** | CoDel (RFC 8289), adaptive accept pause under load |
| ✅ | **Streaming request body** | Optional via [`HttpRequest::readBody()`](/en/docs/reference/server/http-request.html); uploads without keeping the body in RAM |
| ✅ | **sendFile** | Efficient file delivery from disk directly out of the handler |
| ✅ | **Built-in worker pool** | `setWorkers(N)`: N threads via `Async\ThreadPool` + `SO_REUSEPORT` |
| ✅ | **Per-request scope** | Each handler in its own scope; `Async\request_context()` gives a shared context across the entire request coroutine tree |
| ✅ | **Native coroutines** | Deep TrueAsync integration: any blocking I/O in the handler suspends the coroutine, not the thread |
| ✅ | **Zero-copy** | Minimal allocations on the hot path |
| 📋 | **WebSocket** | RFC 6455, Upgrade from HTTP/1.1 and HTTP/2 |
| 📋 | **SSE** | Server-Sent Events |
| 📋 | **gRPC** | over HTTP/2, unary and streaming |

## Architecture: single-threaded event loop

The same model used by [NGINX](https://nginx.org), [Envoy](https://www.envoyproxy.io),
[Node.js](https://nodejs.org), and Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs).

**One thread owns both the connection and the request from accept to send.**
There is no handoff between an accept thread and a worker thread, no locks, no context switches
between them. A single event loop accepts the connection, reads bytes from the socket, parses HTTP,
dispatches the request to the handler, and writes the response — without leaving the thread.

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

Non-blocking I/O is provided by the **libuv reactor** (through TrueAsync). When a coroutine needs
to wait on a file, database, or the next WebSocket frame, it yields control to the event loop,
which immediately picks up the next ready event. The thread never sits idle in `read()`/`recv()`.

To scale across cores, **multi-worker** mode is enabled via
[`setWorkers(N)`](/en/docs/reference/server/http-server-config.html#setworkers):
the built-in `Async\ThreadPool` spins up N OS threads, each with its own independent event loop,
and `SO_REUSEPORT` (Linux/BSD) lets the kernel distribute incoming connections across them.
No shared state, no global locks.

## Where to start

- [Quick start](/en/docs/server/quickstart.html): install and a minimal example in 5 minutes
- [Configuration](/en/docs/server/configuration.html): listeners, workers, TLS, timeouts, body streaming, bootloader
- [Compression](/en/docs/server/compression.html): gzip / brotli / zstd, negotiation, BREACH
- [Static files and sendFile](/en/docs/server/static-files.html): `StaticHandler`, precompressed sidecars, Range
- [Streaming](/en/docs/server/streaming.html): request body and response streaming
- [Multi-worker](/en/docs/server/workers.html): `setWorkers(N)`, bootloader, per-request scope
- [Examples](/en/docs/server/examples.html): JSON API, static, fan-out, multipart upload
- [Architecture](/en/architecture/server.html): internals

### API reference

- [`TrueAsync\HttpServer`](/en/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/en/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/en/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/en/docs/reference/server/http-response.html)
- [`TrueAsync\StaticHandler`](/en/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/en/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/en/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/en/docs/reference/server/log-severity.html)
- [Exceptions](/en/docs/reference/server/exceptions.html)

## Alternatives

[FrankenPHP](/en/docs/frankenphp.html) is a separate embeddable server built on Caddy/Go, where
PHP acts as a worker. It is a good fit when you need Caddy features (automatic Let's Encrypt,
configuration through a Caddyfile) or integration into an existing Caddy deployment. TrueAsync
Server is the native alternative without a Go runtime: the server lives directly inside the PHP
process.
