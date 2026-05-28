---
layout: docs
lang: en
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /en/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "Full reference for HttpServerConfig: listeners, workers, TLS, timeouts, backpressure, drain, compression, HTTP/3 knobs, body streaming, logging."
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

Server configuration. All methods are fluent (returning `static`). Once the object is passed into
`new HttpServer($config)`, the config is **frozen**: every setter throws
`HttpServerRuntimeException`. Check it with `isLocked()`.

See also [Configuration](/en/docs/server/configuration.html) — a step-by-step guide.

## Constructor

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

The optional parameters are a shortcut for a single-listener setup. More commonly the constructor
is called with no arguments and `addListener()` is used instead.

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

TCP listener accepting HTTP/1.1 and HTTP/2 (h2c via preface detection on plaintext, h2 via ALPN on
TLS).

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

HTTP/1.1-only TCP listener. A connection arriving with an HTTP/2 preface is handed to llhttp,
which emits a compliant 400 Bad Request and closes.

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

HTTP/2-only listener.

- `$tls=false`: h2c (cleartext H2). The listener requires the RFC 7540 §3.5 preface; anything else
  goes into nghttp2's `BAD_CLIENT_MAGIC` and receives a compliant `GOAWAY(PROTOCOL_ERROR)`.
- `$tls=true`: the server advertises only `h2` via ALPN.

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix-socket listener (H1 + H2, h2c style).

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

HTTP/3 / QUIC over UDP. TLS 1.3 is mandatory — the server certificate is used; there is no
separate `$tls` flag. The extension must be built with `--enable-http3`, otherwise `start()`
throws.

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

Array of all registered listeners.

## Connection limits

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

Socket backlog. Default 128.

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

Built-in worker pool size (issue #11).

- `1` (default) — single-threaded.
- `> 1` — `start()` spawns an `Async\ThreadPool` of the given size, the config + handler set are
  replicated via `transfer_obj`, and the parent waits for all workers to finish. Each worker
  re-binds the listeners; the kernel balances accepts via `SO_REUSEPORT` (Linux/BSD).

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

Per-worker startup hook. The pool deep-copies the closure once and runs it on every worker before
the task loop — the perfect place for autoload, connection-pool warmup, and opcache pre-compile.

Applied only when `setWorkers() > 1`. An exception in the bootloader fails the entire pool.
Requires TrueAsync ABI v0.15+.

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

Hard cap on concurrent connections. `0` — no limit.

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

Admission control: when the limit is hit, new requests receive a fast rejection — H1 → 503 +
`Retry-After: 1`, H2 → `RST_STREAM REFUSED_STREAM` (retry-safe per RFC 7540 §8.1.4). `0` —
disabled (default); if `0` remains at `start()`, the limit is derived as `max_connections × 10`.

## Timeouts

| Method | What it times out |
|--------|-------------------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | request receive |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | response send |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | idle between requests; `0` disables keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | how long to wait for active requests during graceful shutdown |

Values are in seconds. `0` (where applicable) means disabled.

## Backpressure (CoDel)

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

CoDel target sojourn. When per-request queue-wait stays above the threshold for 100 ms in a row,
the listen socket is paused. Range 0..10_000, default 5. `0` disables CoDel.

Guidance:
- fast handlers (<5 ms) — the default of 5
- typical web — 10..20
- slow handlers (database, IO) — 50..100

## Graceful drain (Step 8)

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

After `(age ± 10% jitter)` lifetime — H1 emits the next response with `Connection: close`, H2
emits a `GOAWAY`. Equivalent to gRPC `MAX_CONNECTION_AGE`. Default `0` (off); production
recommendation is 600_000 (10 min) behind an L4 LB. Must be `0` or ≥ 1000.

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

Hard-close after `Connection: close`/`GOAWAY`. `0` — no force-close timer; non-zero ≥ 1000.

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

Window for evenly spreading per-connection drain on CoDel trip / hard-cap (anti-thundering-herd).
Equivalent to HAProxy `close-spread-time`. Default 5000, ≥ 100.

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

Minimum gap between reactive drain triggers. Triggers inside the cooldown increment a telemetry
counter. Default 10_000, ≥ 1000.

## HTTP/2 streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

Per-stream chunk-queue cap that backs `HttpResponse::send()` backpressure. HTTP/2 only; HTTP/1
chunked uses the kernel send buffer.

Default 262_144 (256 KiB). Range 4_096..67_108_864 (64 MiB).

Industry baselines: gRPC-Go 64 KiB, Envoy 1 MiB, Node.js 16 KiB.

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

Per-worker cap for HTTP/2 static-file body buffers (read-ahead chunks + ring queues). `0` — auto
(`memory_limit / 8`). Any explicit value is clamped so the static budget does not exceed
`memory_limit` minus a small reserve.

## Body limits

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

Maximum request body size (H1 and H2). H1 — 413 + close; H2 — `RST_STREAM(INTERNAL_ERROR)` (the
connection stays open for other streams).

Default 10_485_760 (10 MiB). Range 1_024..17_179_869_184 (16 GiB).

## HTTP/3 knobs

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout` (RFC 9000 §10.1). Default 30_000 (30 s). Range 0..UINT32_MAX (~49 days);
`0` advertises "no idle timeout". The legacy env `PHP_HTTP3_IDLE_TIMEOUT_MS` still works as an ops
escape hatch.

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

Per-stream QUIC flow-control window. Sets all three: `initial_max_stream_data_bidi_local`,
`_bidi_remote`, and `_uni` (h2o `http3-input-window-size` style). The connection-level
`initial_max_data` is derived as `window × max_concurrent_streams` (the nginx pattern).

Default 262_144 (256 KiB). Range 1_024..1_073_741_824 (1 GiB).

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`. Equivalent to nginx `http3_max_concurrent_streams`. Default 100,
range 1..1_000_000.

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

Per-source-IP cap on concurrent QUIC connections. Mitigates handshake slow-loris and amplification.
Default 16, range 1..4_096. The legacy env `PHP_HTTP3_PEER_BUDGET` still overrides at listener
spawn.

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400` on H1/H2 responses when an H3 listener is up. Default
`true`. Disable for a phased H3 rollout. The legacy env `PHP_HTTP3_DISABLE_ALT_SVC` is honoured at
`start()`.

## Compression

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

Master switch. Default `true`. If the extension was built without `--enable-http-compression`,
only `false` is accepted — `true` throws.

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip level. zlib semantics: 1 — fastest/weakest, 9 — slowest/strongest. Default 6.

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality. Range 0..11. Default 4 (production-typical; quality 11 ≈ 50× slower than quality 4
with marginal ratio gain).

Inert if the extension was built without `--enable-brotli` — the response pipeline never picks
Brotli without `HAVE_HTTP_BROTLI`, no matter what is passed here.

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd level. Range 1..22. Default 3 — the zstd team's production default (better ratio than
gzip-6 with higher throughput).

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

Body-size threshold — below it the response is not compressed. Default 1024 (1 KiB). Range
0..16 MiB.

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

MIME whitelist for compression. **Fully replaces** the default (nginx `gzip_types` semantics).
Entries are normalised at setter time: parameters (`; charset=...`) are stripped, whitespace is
trimmed, everything is lowercased.

Default: `["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`.

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

Anti-zip-bomb cap on decompressed bodies (`Content-Encoding: gzip/br/zstd` inbound). On overflow —
413. `0` disables the cap (explicitly — there is no implicit-unlimited). Default 10_485_760
(10 MiB).

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

List of codecs compiled into this build, in server preference order. Always contains
`"identity"`; `"gzip"` appears on successful `--enable-http-compression`; `"br"` / `"zstd"` appear
when the corresponding library is present at configure time.

## Buffers

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

Write-buffer size.

## Protocol options

| Method | Purpose |
|--------|---------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2 (TODO) |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS (TODO) |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | auto-detect protocol on the listener |

## TLS

| Method | Purpose |
|--------|---------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle TLS on the default listener |
| `setCertificate(string)` / `getCertificate(): ?string` | path to the PEM certificate |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | path to the PEM key |

## Body handling

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

When `true`, non-multipart requests wait for the full body before calling the handler. Multipart
is always streamed. Default `true`.

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

Stream request bodies into a per-request queue (issue #26) instead of accumulating them in
`req->body`. Handlers must read through
[`HttpRequest::readBody()`](/en/docs/reference/server/http-request.html#readbody); `getBody()`
throws.

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

Default `JSON_*` flags for
[`HttpResponse::json()`](/en/docs/reference/server/http-response.html#json) when the per-call
`$flags=0` (or omitted).

Default: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`JSON_THROW_ON_ERROR` is silently stripped — an encode error produces a 500 JSON error and the
exception is not propagated.

## Logging / telemetry

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

Logger severity. Default `OFF`. Severity is fixed at start — runtime changes are not supported
(single-threaded lock-free model). See
[`LogSeverity`](/en/docs/reference/server/log-severity.html).

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

Logger sink. Any `php_stream` (file, `php://stderr`, `php://memory`, user wrapper). The logger
stays disabled until **both** are set: a non-OFF severity AND a stream.

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

W3C Trace Context parsing — incoming `traceparent` / `tracestate` are attached to the request and
exposed via [`HttpRequest::getTraceParent/getTraceId/...`](/en/docs/reference/server/http-request.html).

## State

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

`true` after the config is passed into `new HttpServer()`. A locked config rejects every setter
with `HttpServerRuntimeException`.

## See also

- [Configuration](/en/docs/server/configuration.html) — step-by-step guide
- [`TrueAsync\HttpServer`](/en/docs/reference/server/http-server.html)
- [`TrueAsync\LogSeverity`](/en/docs/reference/server/log-severity.html)
