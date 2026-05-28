---
layout: docs
lang: en
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /en/docs/server/configuration.html
page_title: "TrueAsync Server: configuration"
description: "HttpServerConfig: listeners, TLS, timeouts, backpressure, body limits, body streaming, JSON flags, logging, HTTP/3."
---

# TrueAsync Server configuration

(PHP 8.6+, true_async_server 0.6+)

All server configuration is set through the
[`TrueAsync\HttpServerConfig`](/en/docs/reference/server/http-server-config.html) object before
calling `new HttpServer($config)`. Once `HttpServer` is constructed, the config is **frozen**:
any setter on it throws `HttpServerRuntimeException`.

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use TrueAsync\LogSeverity;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->addListener('0.0.0.0', 8443, tls: true)
    ->addHttp3Listener('0.0.0.0', 8443)
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key')
    ->setWorkers(4)
    ->setKeepAliveTimeout(60)
    ->setMaxBodySize(50 * 1024 * 1024)
    ->setCompressionEnabled(true)
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);

$server = new HttpServer($config);
```

Setters return `static`, so the config is built as a chain.

## Listeners

The server can listen on any number of TCP/Unix sockets and UDP ports (for HTTP/3) at the same
time.

| Method | What it does |
|--------|--------------|
| `addListener($host, $port, $tls = false)` | TCP, HTTP/1.1 + HTTP/2 (h2c by preface on plaintext, h2 via ALPN on TLS) |
| `addHttp1Listener($host, $port, $tls = false)` | TCP, HTTP/1.1 only. A client sending an HTTP/2 preface gets 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP, HTTP/2 only. Without TLS this is h2c and the preface is required |
| `addHttp3Listener($host, $port)` | UDP, HTTP/3 / QUIC. TLS 1.3 is enabled automatically, the server certificate is used |
| `addUnixListener($path)` | Unix socket, HTTP/1.1 + HTTP/2 (h2c-style) |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // H3 / QUIC on the same port
```

For a phased HTTP/3 rollout you can temporarily disable the `Alt-Svc` advertisement:

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

The certificate and key are shared across all TLS listeners (including HTTP/3). TLS 1.2/1.3, ALPN,
weak ciphers disabled, stateless session tickets, safe renegotiation off.

## Workers and bootloader

`setWorkers(1)` (the default) enables single-threaded mode: `start()` runs the event loop on the
calling thread.

`setWorkers(N > 1)` spins up the built-in pool of N threads via `Async\ThreadPool`. Each worker
re-binds the same listeners and the kernel (Linux/BSD) distributes accepts through `SO_REUSEPORT`.
The parent `start()` waits for all workers to finish.

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // runs once in each worker before the task loop
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

Details: [Multi-worker](/en/docs/server/workers.html).

## Timeouts

| Method | Default | What it times out |
|--------|---------|-------------------|
| `setReadTimeout($sec)` | — | receiving the full request |
| `setWriteTimeout($sec)` | — | sending the response |
| `setKeepAliveTimeout($sec)` | — | idle between requests; `0` disables keep-alive |
| `setShutdownTimeout($sec)` | — | graceful shutdown: how long to wait for active requests |

## Limits and backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** — hard limit on the number of TCP connections. `0` removes the cap.
- **`setMaxInflightRequests($n)`** — admission control: once the in-flight handler count hits this
  limit, new requests get a fast rejection. H1 → 503 + `Retry-After: 1`; H2 →
  `RST_STREAM REFUSED_STREAM` (retry-safe per RFC 7540 §8.1.4). A hard connection cap does not help
  on H2, because new streams arrive over an already-accepted connection. `0` derives the limit as
  `max_connections × 10`.
- **`setMaxBodySize($bytes)`** — maximum request body size. Default 10 MiB, range 1 KiB..16 GiB.
  H1 returns 413 and closes the connection; H2 sends `RST_STREAM(INTERNAL_ERROR)`.
- **`setBackpressureTargetMs($ms)`** — CoDel sojourn threshold for accept-side backpressure.
  When the per-request queue-wait stays above the threshold for 100 ms in a row, the listen socket
  is paused. `0` disables CoDel. Default 5 ms; 10–20 ms is typical for web workloads; 50–100 ms
  for slow handlers (database, IO).

### Graceful drain (Step 8)

Controls for migrating load behind an L4 balancer:

| Method | Default | Purpose |
|--------|---------|---------|
| `setMaxConnectionAgeMs($ms)` | 0 (off) | After ±10% jitter on the limit, a connection gets Connection: close (H1) or GOAWAY (H2). Equivalent to gRPC `MAX_CONNECTION_AGE`. Production: 600_000 (10 min). |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | Hard-close after `Connection: close`/GOAWAY. `0` disables the force-close timer. |
| `setDrainSpreadMs($ms)` | 5000 | Window for evenly spreading per-connection drain on CoDel trip / hard-cap (anti-thundering-herd). |
| `setDrainCooldownMs($ms)` | 10_000 | Minimum gap between reactive drain triggers. |

## HTTP/2 streaming limits

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 256 KiB per stream, 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = auto (memory_limit / 8)
```

`HttpResponse::send($chunk)` blocks the handler coroutine **only** under backpressure, when the
per-stream staging buffer is full. The default is 256 KiB (for comparison: gRPC-Go 64 KiB, Envoy
1 MiB, Node.js 16 KiB).

## HTTP/3 production knobs

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // per-stream flow control
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // per-source-IP cap, slow-loris protection
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc advertisement
```

The connection-level `initial_max_data` is derived as `window × max_concurrent_streams` (the nginx
pattern).

## Body streaming

Enables pull-based request-body streaming (issue #26): the H1/H2 parsers push chunks into a queue
and the handler reads them through
[`HttpRequest::readBody()`](/en/docs/reference/server/http-request.html#readbody) without holding
the entire body in RAM.

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // process chunk (e.g., stream write to disk, parse on the fly)
    }
    $res->setStatusCode(204);
});
```

Without `setBodyStreamingEnabled(true)`, the handler receives the already-read body through
`getBody()`; `readBody()` is unavailable in that mode.

A 50-parallel-20-MiB-POST comparison (h2load, WSL2): peak RSS drops 1170 MiB → **197 MiB** (×6),
throughput climbs from 36 req/s → **100 req/s** (×2.7), because handler dispatch no longer waits
for the full body.

See also [Streaming](/en/docs/server/streaming.html).

## Auto-await body

```php
$config->setAutoAwaitBody(true);   // default: true
```

When enabled, non-multipart requests wait for the full body before calling the handler (multipart
is always streamed). Useful for classic whole-body processing.

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

These flags are applied to [`HttpResponse::json()`](/en/docs/reference/server/http-response.html#json)
when the caller does not pass `$flags` explicitly. `JSON_THROW_ON_ERROR` is silently stripped:
an encoding error produces a 500 with a JSON error body — the exception is not propagated into the
handler.

## Logging

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // any php_stream: file, php://stderr, php://memory, user wrapper
```

The logger is disabled by default (`LogSeverity::OFF`). Severity is fixed at start; runtime changes
are not supported (single-threaded lock-free model).

Levels (OpenTelemetry SeverityNumber):

| Level | Contents |
|-------|----------|
| `OFF` (0) | nothing |
| `DEBUG` (5) | H3 packet tracing and similar |
| `INFO` (9) | server lifecycle (start/stop), bind retries |
| `WARN` (13) | TLS handshake fail, peer reset, absorbed exceptions |
| `ERROR` (17) | listener bind failed, hard protocol errors |

`FATAL` is intentionally absent: it travels through `zend_error_noreturn(E_ERROR)`, which already
terminates the process.

## Telemetry (W3C Trace Context)

```php
$config->setTelemetryEnabled(true);
```

When enabled, incoming `traceparent` / `tracestate` are parsed and attached to the request.
The following are available inside the handler:

```php
$req->getTraceParent();   // raw header
$req->getTraceState();
$req->getTraceId();       // 32 lower-hex chars
$req->getSpanId();        // 16 lower-hex chars
$req->getTraceFlags();    // int (0x01 = sampled)
```

## Full reference

See [`TrueAsync\HttpServerConfig`](/en/docs/reference/server/http-server-config.html): all 60+
methods with detailed descriptions and valid value ranges.
