---
layout: docs
lang: zh
path_key: "/docs/server/configuration.html"
nav_active: docs
permalink: /zh/docs/server/configuration.html
page_title: "TrueAsync Server：配置"
description: "HttpServerConfig：listeners、TLS、超时、backpressure、请求体上限、流式请求体、JSON 标志、日志、HTTP/3。"
---

# TrueAsync Server 配置

(PHP 8.6+, true_async_server 0.6+)

所有服务器配置都通过
[`TrueAsync\HttpServerConfig`](/zh/docs/reference/server/http-server-config.html) 对象在调用
`new HttpServer($config)` 之前完成。`HttpServer` 一旦创建，配置对象会被**冻结**：
此后调用任何 setter 都会抛出 `HttpServerRuntimeException`。

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

所有 setter 都返回 `static`，因此配置可以链式构建。

## Listeners

服务器可以同时监听任意数量的 TCP/Unix 套接字以及 UDP 端口（HTTP/3）。

| 方法 | 作用 |
|------|------|
| `addListener($host, $port, $tls = false)` | TCP，HTTP/1.1 + HTTP/2（明文使用 preface 协商 h2c；TLS 使用 ALPN 协商 h2） |
| `addHttp1Listener($host, $port, $tls = false)` | TCP，仅 HTTP/1.1。带 HTTP/2 preface 的客户端会收到 400 |
| `addHttp2Listener($host, $port, $tls = false)` | TCP，仅 HTTP/2。不启用 TLS 时是 h2c，必须有 preface |
| `addHttp3Listener($host, $port)` | UDP，HTTP/3 / QUIC。自动启用 TLS 1.3，复用服务器证书 |
| `addUnixListener($path)` | Unix 套接字，HTTP/1.1 + HTTP/2（h2c 风格） |

```php
$config
    ->addListener('0.0.0.0', 80)              // H1 + H2c
    ->addListener('0.0.0.0', 443, tls: true)  // H1 + H2 over TLS
    ->addHttp3Listener('0.0.0.0', 443);       // 同一端口的 H3 / QUIC
```

如需对 HTTP/3 做分阶段灰度发布，可以暂时关闭 `Alt-Svc` 通告：

```php
$config->setHttp3AltSvcEnabled(false);
```

## TLS

```php
$config
    ->setCertificate('/etc/tls/server.crt')
    ->setPrivateKey('/etc/tls/server.key');
```

证书和私钥被所有 TLS listener 共用（包括 HTTP/3）。TLS 1.2/1.3、ALPN，弱密码套件被关闭，
启用 stateless session tickets，安全重协商被禁用。

## Workers 与 bootloader

`setWorkers(1)`（默认值）启用单线程模式：`start()` 在调用线程上跑 event-loop。

`setWorkers(N > 1)` 通过 `Async\ThreadPool` 启动一个内置的 N 线程池。每个 worker 在相同的
listener 上重新 bind，内核（Linux/BSD）通过 `SO_REUSEPORT` 在它们之间分发新连接。
父级的 `start()` 会等待所有 worker 完成。

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // 每个 worker 在任务循环之前会执行一次
        require __DIR__ . '/vendor/autoload.php';
        Database::warmupPool();
        OpcacheWarm::compile();
    });
```

详见：[Multi-worker](/zh/docs/server/workers.html)。

## 超时

| 方法 | 默认值 | 控制范围 |
|------|--------|----------|
| `setReadTimeout($sec)` | — | 接收完整请求 |
| `setWriteTimeout($sec)` | — | 发送完整响应 |
| `setKeepAliveTimeout($sec)` | — | 请求之间的空闲时间；设为 `0` 关闭 keep-alive |
| `setShutdownTimeout($sec)` | — | 优雅关停：等待活跃请求的时长 |

## 限额与 backpressure

```php
$config
    ->setBacklog(1024)
    ->setMaxConnections(50_000)
    ->setMaxInflightRequests(10_000)
    ->setMaxBodySize(10 * 1024 * 1024)
    ->setBackpressureTargetMs(10);
```

- **`setMaxConnections($n)`** —— TCP 连接数的硬上限。`0` 表示不限制。
- **`setMaxInflightRequests($n)`** —— 准入控制：在达到该数量的活跃处理程序之后，
  新请求会立刻被快速拒绝。H1 → 503 + `Retry-After: 1`，H2 → `RST_STREAM REFUSED_STREAM`
  （依 RFC 7540 §8.1.4，可安全重试）。在 H2 上，连接级的硬限制起不到作用，
  因为新 stream 会复用已建立的连接。`0` 会取 `max_connections × 10` 作为限额。
- **`setMaxBodySize($bytes)`** —— 请求体上限。默认 10 MiB，范围 1 KiB..16 GiB。
  H1 返回 413 并关闭连接；H2 发送 `RST_STREAM(INTERNAL_ERROR)`。
- **`setBackpressureTargetMs($ms)`** —— accept 侧 backpressure 的 CoDel sojourn 阈值。
  当每个请求的 queue-wait 持续 100 ms 高于该阈值时，listen 套接字会被暂停。
  `0` 关闭 CoDel。默认 5 ms；典型 web 场景 10–20 ms；处理程序较慢（数据库、IO）时 50–100 ms。

### 优雅排空（Step 8）

控制 L4 负载均衡器背后的流量迁移：

| 方法 | 默认值 | 作用 |
|------|--------|------|
| `setMaxConnectionAgeMs($ms)` | 0（关闭） | 在 ±10% jitter 的上限之后，连接被附上 Connection: close（H1）或 GOAWAY（H2）。对应 gRPC 的 `MAX_CONNECTION_AGE`。生产建议：600_000（10 分钟）。 |
| `setMaxConnectionAgeGraceMs($ms)` | 0 | 在 `Connection: close` / GOAWAY 之后的强制关闭时长。`0` 关闭强制关闭计时器。 |
| `setDrainSpreadMs($ms)` | 5000 | CoDel 触发或 hard-cap 时，逐连接 drain 的均匀分散窗口（防止惊群）。 |
| `setDrainCooldownMs($ms)` | 10_000 | 两次反应式 drain 触发之间的最小间隔。 |

## HTTP/2 streaming 限额

```php
$config
    ->setStreamWriteBufferBytes(256 * 1024)  // 每个 stream 256 KiB，范围 4 KiB .. 64 MiB
    ->setH2StaticBudgetMax(0);               // 0 = 自动（memory_limit / 8）
```

`HttpResponse::send($chunk)` **只会**在出现 backpressure 时阻塞处理程序协程：
即 per-stream staging 缓冲区已写满时。默认 256 KiB（对比：gRPC-Go 64 KiB、Envoy 1 MiB、Node.js 16 KiB）。

## HTTP/3 生产调优

```php
$config
    ->setHttp3IdleTimeoutMs(30_000)           // RFC 9000 §10.1
    ->setHttp3StreamWindowBytes(256 * 1024)   // 每 stream 流控
    ->setHttp3MaxConcurrentStreams(100)       // initial_max_streams_bidi
    ->setHttp3PeerConnectionBudget(16)        // per-source-IP 上限，防 slow-loris
    ->setHttp3AltSvcEnabled(true);            // RFC 7838 Alt-Svc 通告
```

连接级的 `initial_max_data` 会按 `window × max_concurrent_streams` 推导（参考 nginx 的做法）。

## 流式请求体

启用 pull-based 的请求体流式读取（issue #26）：H1/H2 解析器把 chunk 放入队列，处理程序通过
[`HttpRequest::readBody()`](/zh/docs/reference/server/http-request.html#readbody)
逐块读取，无需把整个请求体留在内存里。

```php
$config->setBodyStreamingEnabled(true);

$server->addHttpHandler(function ($req, $res) {
    while (($chunk = $req->readBody()) !== null) {
        // 处理 chunk（例如流式写盘、解析）
    }
    $res->setStatusCode(204);
});
```

如果没有调用 `setBodyStreamingEnabled(true)`，处理程序通过 `getBody()` 拿到的是
已经完整读取的请求体；此模式下 `readBody()` 不可用。

50 个并发 20 MiB POST（h2load，WSL2）对照测试：峰值 RSS 从 1170 MiB 降到 **197 MiB**（×6），
吞吐从 36 req/s 提升到 **100 req/s**（×2.7），因为处理程序的派发不再等待完整请求体。

也可参考 [流式传输](/zh/docs/server/streaming.html)。

## 自动等待请求体

```php
$config->setAutoAwaitBody(true);   // 默认：true
```

启用后，非 multipart 请求会等待请求体完全到达后再调用处理程序
（multipart 永远走流式）。这适合传统的"一次性处理完整请求体"的场景。

## JSON

```php
$config->setJsonEncodeFlags(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

当调用方未显式传 `$flags` 时，这些标志会作用于
[`HttpResponse::json()`](/zh/docs/reference/server/http-response.html#json)。
`JSON_THROW_ON_ERROR` 会被静默剥除：编码失败会返回 500 + JSON 错误体，
异常不会向处理程序抛出。

## 日志

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::INFO)
    ->setLogStream(STDERR);   // 任何 php_stream：文件、php://stderr、php://memory、用户 wrapper
```

日志默认关闭（`LogSeverity::OFF`）。severity 在启动时固定，运行时不支持切换
（单线程 lock-free 模型）。

级别（OpenTelemetry SeverityNumber）：

| 级别 | 输出内容 |
|------|----------|
| `OFF` (0) | 不输出 |
| `DEBUG` (5) | H3 包跟踪等 |
| `INFO` (9) | 服务器生命周期（start/stop）、bind 重试 |
| `WARN` (13) | TLS 握手失败、peer reset、被吸收的异常 |
| `ERROR` (17) | listener bind 失败、协议级硬错误 |

故意没有 `FATAL`：那种情况会走 `zend_error_noreturn(E_ERROR)`，进程已经被中断。

## 遥测（W3C Trace Context）

```php
$config->setTelemetryEnabled(true);
```

启用后，传入的 `traceparent` / `tracestate` 会被解析并附加到请求上。
在处理程序里可以这样取：

```php
$req->getTraceParent();   // 原始头
$req->getTraceState();
$req->getTraceId();       // 32 位小写十六进制
$req->getSpanId();        // 16 位小写十六进制
$req->getTraceFlags();    // int（0x01 = sampled）
```

## 完整参考

参见 [`TrueAsync\HttpServerConfig`](/zh/docs/reference/server/http-server-config.html)：
全部 60+ 个方法的详细说明及合法取值范围。
