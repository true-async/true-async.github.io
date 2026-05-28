---
layout: docs
lang: zh
path_key: "/docs/reference/server/http-server-config.html"
nav_active: docs
permalink: /zh/docs/reference/server/http-server-config.html
page_title: "TrueAsync\\HttpServerConfig"
description: "HttpServerConfig 完整参考：listeners、workers、TLS、超时、backpressure、drain、压缩、HTTP/3 调优、流式请求体、日志。"
---

# TrueAsync\HttpServerConfig

(PHP 8.6+, true_async_server 0.6+)

服务器配置。所有方法都是 fluent 的（返回 `static`）。一旦把对象传给 `new HttpServer($config)`，
配置就被**冻结**：任何 setter 都会抛 `HttpServerRuntimeException`。可用 `isLocked()` 检查。

也可参考 [配置](/zh/docs/server/configuration.html) 中按步骤介绍的指南。

## 构造函数

### __construct

```php
public HttpServerConfig::__construct(?string $host = null, int $port = 8080)
```

可选参数是单 listener 的便捷写法。更常见的用法是不传参再用 `addListener()`。

## Listeners

### addListener

```php
public HttpServerConfig::addListener(string $host, int $port, bool $tls = false): static
```

TCP listener，接受 HTTP/1.1 与 HTTP/2（明文走 preface detection 协商 h2c；TLS 走 ALPN 协商 h2）。

### addHttp1Listener

```php
public HttpServerConfig::addHttp1Listener(string $host, int $port, bool $tls = false): static
```

仅 HTTP/1.1 的 TCP listener。带 HTTP/2 preface 的连接交给 llhttp，它会输出合规的
400 Bad Request 并关闭。

### addHttp2Listener

```php
public HttpServerConfig::addHttp2Listener(string $host, int $port, bool $tls = false): static
```

仅 HTTP/2 的 listener。

- `$tls=false`：h2c（明文 H2）。listener 要求 RFC 7540 §3.5 preface；其余情况进入
  nghttp2 的 `BAD_CLIENT_MAGIC`，返回合规的 `GOAWAY(PROTOCOL_ERROR)`。
- `$tls=true`：服务器在 ALPN 中只通告 `h2`。

### addUnixListener

```php
public HttpServerConfig::addUnixListener(string $path): static
```

Unix socket listener（H1 + H2，h2c 风格）。

### addHttp3Listener

```php
public HttpServerConfig::addHttp3Listener(string $host, int $port): static
```

UDP 上的 HTTP/3 / QUIC。强制启用 TLS 1.3 —— 使用服务器证书，没有独立的 `$tls` 标志。
扩展必须用 `--enable-http3` 编译，否则 `start()` 会抛异常。

### getListeners

```php
public HttpServerConfig::getListeners(): array
```

所有已注册 listener 的数组。

## 连接限额

### setBacklog / getBacklog

```php
public HttpServerConfig::setBacklog(int $backlog): static
public HttpServerConfig::getBacklog(): int
```

socket backlog。默认 128。

### setWorkers / getWorkers

```php
public HttpServerConfig::setWorkers(int $workers): static
public HttpServerConfig::getWorkers(): int
```

内置 worker 池的大小（issue #11）。

- `1`（默认） —— 单线程。
- `> 1` —— `start()` 启动指定大小的 `Async\ThreadPool`，通过 `transfer_obj` 复制 config + handler 集合，
  父进程等待所有 worker 结束。每个 worker 重新 bind listener；内核（Linux/BSD）通过
  `SO_REUSEPORT` 负载均衡 accept。

### setBootloader / getBootloader

```php
public HttpServerConfig::setBootloader(?\Closure $bootloader): static
public HttpServerConfig::getBootloader(): ?\Closure
```

per-worker 启动钩子。池会 deep-copy 闭包一次，并在每个 worker 开始 task loop 之前运行 ——
非常适合 autoload、预热连接池、预编译 opcache。

仅在 `setWorkers() > 1` 时生效。bootloader 抛出的异常会让整个池失败。
需要 TrueAsync ABI v0.15+。

### setMaxConnections / getMaxConnections

```php
public HttpServerConfig::setMaxConnections(int $maxConnections): static
public HttpServerConfig::getMaxConnections(): int
```

并发连接的硬上限。`0` —— 不限制。

### setMaxInflightRequests / getMaxInflightRequests

```php
public HttpServerConfig::setMaxInflightRequests(int $n): static
public HttpServerConfig::getMaxInflightRequests(): int
```

准入控制：达到限额时新请求被快速拒绝 —— H1 → 503 + `Retry-After: 1`，
H2 → `RST_STREAM REFUSED_STREAM`（依 RFC 7540 §8.1.4 可安全重试）。`0` —— 关闭（默认）；
如果 `start()` 时仍是 `0`，限额会推导成 `max_connections × 10`。

## 超时

| 方法 | 控制范围 |
|------|----------|
| `setReadTimeout(int)` / `getReadTimeout(): int` | 接收请求 |
| `setWriteTimeout(int)` / `getWriteTimeout(): int` | 发送响应 |
| `setKeepAliveTimeout(int)` / `getKeepAliveTimeout(): int` | 请求间空闲；`0` 关闭 keep-alive |
| `setShutdownTimeout(int)` / `getShutdownTimeout(): int` | 优雅停机时等待活跃请求的时长 |

单位秒。`0`（在允许的方法上）表示关闭。

## Backpressure（CoDel）

### setBackpressureTargetMs / getBackpressureTargetMs

```php
public HttpServerConfig::setBackpressureTargetMs(int $ms): static
public HttpServerConfig::getBackpressureTargetMs(): int
```

CoDel 的 target sojourn。当 per-request queue-wait 持续 100 ms 高于阈值时，listen socket 被暂停。
范围 0..10_000，默认 5。`0` 关闭 CoDel。

经验值：
- 快 handler（< 5 ms） —— 用默认 5
- 典型 web —— 10..20
- 慢 handler（数据库、IO） —— 50..100

## 优雅排空（Step 8）

### setMaxConnectionAgeMs / getMaxConnectionAgeMs

```php
public HttpServerConfig::setMaxConnectionAgeMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeMs(): int
```

寿命达到 `(age ± 10% jitter)` 后 —— H1 在下一次响应附 `Connection: close`，H2 发 `GOAWAY`。
对应 gRPC 的 `MAX_CONNECTION_AGE`。默认 `0`（关闭）；生产建议在 L4 LB 背后用 600_000（10 分钟）。
必须为 `0` 或 ≥ 1000。

### setMaxConnectionAgeGraceMs / getMaxConnectionAgeGraceMs

```php
public HttpServerConfig::setMaxConnectionAgeGraceMs(int $ms): static
public HttpServerConfig::getMaxConnectionAgeGraceMs(): int
```

`Connection: close` / `GOAWAY` 之后的强制关闭时长。`0` 不启用强制关闭计时器；非零必须 ≥ 1000。

### setDrainSpreadMs / getDrainSpreadMs

```php
public HttpServerConfig::setDrainSpreadMs(int $ms): static
public HttpServerConfig::getDrainSpreadMs(): int
```

CoDel 触发 / hard-cap 时 per-connection drain 的均匀分散窗口（防惊群）。
对应 HAProxy 的 `close-spread-time`。默认 5000，≥ 100。

### setDrainCooldownMs / getDrainCooldownMs

```php
public HttpServerConfig::setDrainCooldownMs(int $ms): static
public HttpServerConfig::getDrainCooldownMs(): int
```

两次响应式 drain 触发之间的最小间隔。冷却期内的触发只增 telemetry counter。默认 10_000，≥ 1000。

## HTTP/2 streaming

### setStreamWriteBufferBytes / getStreamWriteBufferBytes

```php
public HttpServerConfig::setStreamWriteBufferBytes(int $bytes): static
public HttpServerConfig::getStreamWriteBufferBytes(): int
```

`HttpResponse::send()` backpressure 用的 per-stream chunk-queue 上限。仅 HTTP/2；
HTTP/1 chunked 使用内核 send-buffer。

默认 262_144（256 KiB）。范围 4_096..67_108_864（64 MiB）。

业界对照：gRPC-Go 64 KiB、Envoy 1 MiB、Node.js 16 KiB。

### setH2StaticBudgetMax / getH2StaticBudgetMax

```php
public HttpServerConfig::setH2StaticBudgetMax(int $bytes): static
public HttpServerConfig::getH2StaticBudgetMax(): int
```

HTTP/2 静态文件 body 缓冲（read-ahead chunks + ring queue）的 per-worker 上限。
`0` —— 自动（`memory_limit / 8`）。显式值会被 clamp，使 static budget 不超过 `memory_limit` 减去小量预留。

## 请求体上限

### setMaxBodySize / getMaxBodySize

```php
public HttpServerConfig::setMaxBodySize(int $bytes): static
public HttpServerConfig::getMaxBodySize(): int
```

请求体上限（H1 和 H2）。H1 —— 413 + close；H2 —— `RST_STREAM(INTERNAL_ERROR)`
（连接保留供其他 stream 使用）。

默认 10_485_760（10 MiB）。范围 1_024..17_179_869_184（16 GiB）。

## HTTP/3 调优

### setHttp3IdleTimeoutMs / getHttp3IdleTimeoutMs

```php
public HttpServerConfig::setHttp3IdleTimeoutMs(int $ms): static
public HttpServerConfig::getHttp3IdleTimeoutMs(): int
```

QUIC `max_idle_timeout`（RFC 9000 §10.1）。默认 30_000（30 秒）。
范围 0..UINT32_MAX（约 49 天）；`0` 通告 "no idle timeout"。
历史环境变量 `PHP_HTTP3_IDLE_TIMEOUT_MS` 仍可作为运维 escape hatch 使用。

### setHttp3StreamWindowBytes / getHttp3StreamWindowBytes

```php
public HttpServerConfig::setHttp3StreamWindowBytes(int $bytes): static
public HttpServerConfig::getHttp3StreamWindowBytes(): int
```

每流 QUIC 流控窗口。会同时设置三项：`initial_max_stream_data_bidi_local`、
`_bidi_remote`、`_uni`（h2o 的 `http3-input-window-size` 风格）。
连接级 `initial_max_data` 由 `window × max_concurrent_streams` 推导（nginx 风格）。

默认 262_144（256 KiB）。范围 1_024..1_073_741_824（1 GiB）。

### setHttp3MaxConcurrentStreams / getHttp3MaxConcurrentStreams

```php
public HttpServerConfig::setHttp3MaxConcurrentStreams(int $n): static
public HttpServerConfig::getHttp3MaxConcurrentStreams(): int
```

QUIC `initial_max_streams_bidi`。对应 nginx 的 `http3_max_concurrent_streams`。
默认 100，范围 1..1_000_000。

### setHttp3PeerConnectionBudget / getHttp3PeerConnectionBudget

```php
public HttpServerConfig::setHttp3PeerConnectionBudget(int $n): static
public HttpServerConfig::getHttp3PeerConnectionBudget(): int
```

每源 IP 的并发 QUIC 连接上限。防 handshake slow-loris 与放大攻击。
默认 16，范围 1..4_096。历史环境变量 `PHP_HTTP3_PEER_BUDGET` 仍会在 listener 启动时覆盖。

### setHttp3AltSvcEnabled / isHttp3AltSvcEnabled

```php
public HttpServerConfig::setHttp3AltSvcEnabled(bool $enable): static
public HttpServerConfig::isHttp3AltSvcEnabled(): bool
```

当存在 H3 listener 时，在 H1/H2 响应上发送 RFC 7838 `Alt-Svc: h3=":<port>"; ma=86400`。
默认 `true`。H3 灰度发布时可关闭。`start()` 时会尊重历史环境变量 `PHP_HTTP3_DISABLE_ALT_SVC`。

## 压缩

### setCompressionEnabled / isCompressionEnabled

```php
public HttpServerConfig::setCompressionEnabled(bool $enable): static
public HttpServerConfig::isCompressionEnabled(): bool
```

总开关。默认 `true`。如果扩展未启用 `--enable-http-compression`，则只接受 `false`；
传 `true` 会抛。

### setCompressionLevel / getCompressionLevel

```php
public HttpServerConfig::setCompressionLevel(int $level): static
public HttpServerConfig::getCompressionLevel(): int
```

gzip 级别。zlib 语义：1 最快/最弱，9 最慢/最强。默认 6。

### setBrotliLevel / getBrotliLevel

```php
public HttpServerConfig::setBrotliLevel(int $level): static
public HttpServerConfig::getBrotliLevel(): int
```

Brotli quality。范围 0..11。默认 4（典型生产值；quality 11 ≈ 比 quality 4 慢 50× 但压缩比收益甚微）。

如果扩展未启用 `--enable-brotli`，此项无效 —— 没有 `HAVE_HTTP_BROTLI` 时，响应流水线
永远不会选 Brotli，无论传什么值。

### setZstdLevel / getZstdLevel

```php
public HttpServerConfig::setZstdLevel(int $level): static
public HttpServerConfig::getZstdLevel(): int
```

zstd 级别。范围 1..22。默认 3 —— zstd 项目的生产默认（压缩比优于 gzip-6，吞吐更高）。

### setCompressionMinSize / getCompressionMinSize

```php
public HttpServerConfig::setCompressionMinSize(int $bytes): static
public HttpServerConfig::getCompressionMinSize(): int
```

响应体大小阈值 —— 小于该值不压缩。默认 1024（1 KiB）。范围 0..16 MiB。

### setCompressionMimeTypes / getCompressionMimeTypes

```php
public HttpServerConfig::setCompressionMimeTypes(array $types): static
public HttpServerConfig::getCompressionMimeTypes(): array
```

压缩 MIME 白名单。**完全替换**默认（nginx `gzip_types` 语义）。
在 setter 阶段做归一化：参数（`; charset=...`）截掉，空格 trim，统一小写。

默认：`["application/javascript", "application/json", "application/xml", "image/svg+xml",
"text/css", "text/html", "text/javascript", "text/plain", "text/xml"]`。

### setRequestMaxDecompressedSize / getRequestMaxDecompressedSize

```php
public HttpServerConfig::setRequestMaxDecompressedSize(int $bytes): static
public HttpServerConfig::getRequestMaxDecompressedSize(): int
```

入站 `Content-Encoding: gzip/br/zstd` 解压后大小的防 zip-bomb 上限。
超过时 —— 413。`0` 关闭上限（必须显式 —— 没有"隐式无上限"的入口）。默认 10_485_760（10 MiB）。

### getSupportedEncodings (static)

```php
public static HttpServerConfig::getSupportedEncodings(): array
```

返回该构建编译进来的编解码器列表，按服务器偏好排序。一定包含 `"identity"`；
`"gzip"` —— 在 `--enable-http-compression` 成功时；`"br"` / `"zstd"` —— 在 configure 阶段
检测到对应库时。

## 缓冲

### setWriteBufferSize / getWriteBufferSize

```php
public HttpServerConfig::setWriteBufferSize(int $size): static
public HttpServerConfig::getWriteBufferSize(): int
```

写缓冲大小。

## 协议选项

| 方法 | 作用 |
|------|------|
| `enableHttp2(bool)` / `isHttp2Enabled(): bool` | toggle HTTP/2（TODO） |
| `enableWebSocket(bool)` / `isWebSocketEnabled(): bool` | toggle WS（TODO） |
| `enableProtocolDetection(bool)` / `isProtocolDetectionEnabled(): bool` | listener 上的协议自动检测 |

## TLS

| 方法 | 作用 |
|------|------|
| `enableTls(bool)` / `isTlsEnabled(): bool` | toggle 默认 listener 的 TLS |
| `setCertificate(string)` / `getCertificate(): ?string` | PEM 证书路径 |
| `setPrivateKey(string)` / `getPrivateKey(): ?string` | PEM 私钥路径 |

## 请求体处理

### setAutoAwaitBody / isAutoAwaitBodyEnabled

```php
public HttpServerConfig::setAutoAwaitBody(bool $enable): static
public HttpServerConfig::isAutoAwaitBodyEnabled(): bool
```

为 `true` 时，非 multipart 请求会等请求体全部收到才调用处理程序。multipart 始终走流式。
默认 `true`。

### setBodyStreamingEnabled / isBodyStreamingEnabled

```php
public HttpServerConfig::setBodyStreamingEnabled(bool $enabled): static
public HttpServerConfig::isBodyStreamingEnabled(): bool
```

把请求体放进 per-request queue 做流式（issue #26），不再累积到 `req->body`。处理程序必须通过
[`HttpRequest::readBody()`](/zh/docs/reference/server/http-request.html#readbody) 读取；
此模式下 `getBody()` 会抛。

## JSON

### setJsonEncodeFlags / getJsonEncodeFlags

```php
public HttpServerConfig::setJsonEncodeFlags(int $flags): static
public HttpServerConfig::getJsonEncodeFlags(): int
```

[`HttpResponse::json()`](/zh/docs/reference/server/http-response.html#json) 在 per-call `$flags=0`
（或省略）时使用的默认 `JSON_*` 标志。

默认：`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`。

`JSON_THROW_ON_ERROR` 会被静默剥除 —— 编码失败给 500 JSON 错误体，不抛异常。

## 日志 / 遥测

### setLogSeverity / getLogSeverity

```php
public HttpServerConfig::setLogSeverity(\TrueAsync\LogSeverity $level): static
public HttpServerConfig::getLogSeverity(): \TrueAsync\LogSeverity
```

日志 severity。默认 `OFF`。severity 在启动时固定 —— 运行时不可切换（单线程 lock-free 模型）。
参见 [`LogSeverity`](/zh/docs/reference/server/log-severity.html)。

### setLogStream / getLogStream

```php
public HttpServerConfig::setLogStream(mixed $stream): static
public HttpServerConfig::getLogStream(): mixed
```

日志 sink。任意 `php_stream`（文件、`php://stderr`、`php://memory`、用户 wrapper）。
**同时**满足 non-OFF severity 和已设置的 stream，日志才打开。

### setTelemetryEnabled / isTelemetryEnabled

```php
public HttpServerConfig::setTelemetryEnabled(bool $enabled): static
public HttpServerConfig::isTelemetryEnabled(): bool
```

启用 W3C Trace Context 解析 —— 入站 `traceparent` / `tracestate` 附加到请求，
通过 [`HttpRequest::getTraceParent/getTraceId/...`](/zh/docs/reference/server/http-request.html) 读取。

## 状态

### isLocked

```php
public HttpServerConfig::isLocked(): bool
```

配置传入 `new HttpServer()` 之后为 `true`。锁定后 setter 全部抛 `HttpServerRuntimeException`。

## 也可参考

- [配置](/zh/docs/server/configuration.html) —— 按步骤的指南
- [`TrueAsync\HttpServer`](/zh/docs/reference/server/http-server.html)
- [`TrueAsync\LogSeverity`](/zh/docs/reference/server/log-severity.html)
