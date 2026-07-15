---
layout: docs
lang: en
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /en/docs/server/observability.html
page_title: "TrueAsync Server: Observability"
description: "Cross-worker request statistics (getStats), multi-sink structured logging (setLogSinks), an OpenTelemetry access log, and runtime allocator counters."
---

# Observability

(PHP 8.6+, true_async_server 0.10+)

Three things a server in production needs to expose: **how many requests it served and
with what status**, **a log it can ship somewhere**, and **an access record per request**.
This page covers all three. None of them is on by default — an idle server pays nothing.

## Cross-worker statistics: `getStats()`

Opt in with `setStatsEnabled(true)`, then read the aggregate with `HttpServer::getStats()`:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // must be set before start()

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

spawn(function () use ($server) {
    while ($server->isRunning()) {
        Async\delay(10_000);
        $stats = $server->getStats();
        error_log("requests so far: " . $stats['totals']['total_requests']);
    }
});

$server->start();
```

`getStats()` throws unless stats were enabled — with them off, no counter slab is allocated
at all. The shape:

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* one worker's counters */ ], 1 => [ … ], … ],
    'reactors' => [ /* requests served entirely on a transport reactor */ ],
    'totals'   => [ /* folded across workers and reactors */ ],
]
```

`totals` is what a scraper wants:

| Counter | Meaning |
|---------|---------|
| `total_requests` | every completed request |
| `responses_2xx_total` … `responses_5xx_total` | classified once each, so the four sum to `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | live connections per protocol (a gauge) |
| `log_records_dropped_total` | log lines a full ring dropped (see below) |

Each counter is combined the way its meaning allows. Monotonic totals **sum, and survive a
`reload()`** — a retiring worker's totals are inherited, so a scraper never sees a counter
run backwards just because the pool rotated. Active gauges sum across live workers only, so a
dead worker's last connection count is not carried forward as a phantom. Reads are lock-free,
so the aggregate can be stale by at most one worker mid-rotation.

> **Do not close over `$server` in a request handler to call `getStats()` from inside it.**
> Under a worker pool that creates a `HttpServer ⇄ handler` reference cycle, and transferring
> the handler into the workers crashes the process
> ([true-async/php-async#196](https://github.com/true-async/php-async/issues/196)). Read stats
> from a separate coroutine that owns `$server`, as above — not from the handler.

## Structured logging: `setLogSinks()`

One log record fans out to several **sinks** at once, each with its own destination, format
and severity floor:

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // structured access log -> a file, as OpenTelemetry JSON
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // human-readable diagnostics -> the console, coloured
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

This supersedes the single-stream `setLogSeverity()` / `setLogStream()` sugar. Up to 8 sinks;
an invalid spec throws at `setLogSinks()` time, not at `start()`.

**Sink types** — `stream`, `file`, `stdout`, `stderr`, `syslog`. Under a worker pool use
`file` (or `stdout`/`stderr`), never `stream`: a PHP stream resource opened by the parent
cannot cross into a worker thread — the sink stays on the parent and is skipped in the workers
with a start-up notice. `file` works because each worker reopens the path itself (append mode).

**Formats** — `plain`, `logfmt`, `json` (one OpenTelemetry-Logs object per line), `pretty`
(a coloured console line, colour decided from the target fd honouring `NO_COLOR` /
`CLICOLOR_FORCE`), and `template` for a custom layout:

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}` (ISO-8601) or `{ts:PATTERN}` with a `date()`-style subset (`Y y m d H i s v`), plus
`{level}`, `{msg}`, `{attrs}`, `{trace}`, `{span}`; anything else is literal.

**`syslog`** emits RFC 5424 — octet-framed (RFC 6587) over TCP, one record per datagram on
`udp` / `udg`:

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### The access log: `'category' => 'access'`

A sink's `category` routes record kinds: `app` (the default) receives server diagnostics,
`access` receives exactly **one structured record per completed request**, and `all` receives
both — so a JSON access log and a pretty diagnostics console coexist on one server.

Access records use stable OpenTelemetry HTTP semantic conventions. One line from the `json`
formatter, pretty-printed:

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
    "SeverityNumber": 9,
    "SeverityText": "INFO",
    "Body": "GET /x 200",
    "Attributes": {
        "http.request.method": "GET",
        "url.path": "/x",
        "http.response.status_code": 200,
        "network.protocol.version": "1.1",
        "http.response.body.size": 11,
        "http.server.request.duration": 9.266e-06,
        "client.address": "127.0.0.1",
        "client.port": 42336
    }
}
```

Emitted on every completion path — handler return, static file, `sendFile()`,
compression-reject, reactor-pool dispatch — across HTTP/1, HTTP/2 and HTTP/3, including under
a worker pool. The W3C trace context is added when the request carried one. Text formatters
escape control bytes in values, so a request-derived field cannot forge a log line.

### No sink calls back into PHP

Records are emitted from libuv IO callbacks and from HTTP/3 reactor threads that have no PHP
context, so the log path must never re-enter the VM — there is no "call a PHP callable" sink,
by design. To export logs from userland, point a sink at a file or socket with
`'format' => 'json'` and drain it from your own coroutine. That is the async-appender shape,
and it also keeps exporter latency off the request path.

A sink's ring is bounded — the producer must never block — so a burst that outruns the writer
costs records. Those are counted in `log_records_dropped_total` (see `getStats()` above), not
silently lost.

## Runtime allocator counters: `getRuntimeStats()`

`HttpServer::getRuntimeStats()` reports the server's own internal allocators and cross-worker
topic traffic — the counters that let you attribute RSS to a subsystem instead of guessing:

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` — the
  connection slab (one `http_connection_t` per live TCP connection).
- `body_pool` — per-size-class cache of large request bodies, with `body_pool_total_bytes`.
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` — cross-worker
  [WebSocket topic](/en/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)
  delivery: publishes handed to another worker, workers the interest filter let a publisher
  skip, and publishes a full mailbox dropped (that last one is data loss).

Unlike `getStats()`, this one needs no opt-in.

## HTTP/3 counters: `getHttp3Stats()`

One entry per HTTP/3 listener, with per-listener QUIC counters (`quic_packets_sent`,
`quic_bytes_sent`, datagram counts, `poll_rearms`, …). Returns an empty array on a build
without `--enable-http3`. Each counter is read with an individual relaxed atomic load, so the
report is internally consistent even while the reactor thread keeps writing.

## See also

- [Multi-worker](/en/docs/server/workers.html): logging and shutdown under a pool
- [Configuration](/en/docs/server/configuration.html)
- [`HttpServer::getStats()`](/en/docs/reference/server/http-server.html)
