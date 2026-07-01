---
layout: docs
lang: zh
path_key: "/docs/reference/server/http-server.html"
nav_active: docs
permalink: /zh/docs/reference/server/http-server.html
page_title: "TrueAsync\\HttpServer"
description: "TrueAsync\\HttpServer —— 内置 HTTP 服务器主类。注册处理程序、启动/停止、遥测、运行时统计。"
---

# TrueAsync\HttpServer

(PHP 8.6+, true_async_server 0.6+)

内置服务器的主类。通过构造函数接收配置，注册协议处理程序，调用 `start()` 后阻塞当前线程
直到 `stop()`。

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

## 方法

### __construct

```php
public HttpServer::__construct(HttpServerConfig $config)
```

用给定配置创建服务器。**配置在此处被冻结** —— 之后调用 setter 会抛 `HttpServerRuntimeException`。

### addHttpHandler

```php
public HttpServer::addHttpHandler(callable $handler): static
```

注册 HTTP/1.1 与 HTTP/2 请求的处理程序。签名：

```php
function (HttpRequest $request, HttpResponse $response): void
```

每个请求都在**独立的协程**中、在 [per-request scope](/zh/docs/server/workers.html#per-request-scope) 下执行。
处理程序返回 `void`；响应通过 `$response` 发送。

### addStaticHandler

```php
public HttpServer::addStaticHandler(StaticHandler $handler): static
```

注册 static 挂载（issue #13）。落在 `$handler->getUrlPrefix()` 下的请求**完全在 C 内**响应 ——
不派生协程，也不进入 PHP VM。

多个挂载按注册顺序匹配。attach 之后 handler **被锁定** —— 再调用 setter 会抛 `HttpServerRuntimeException`。

参见 [`StaticHandler`](/zh/docs/reference/server/static-handler.html)。

### addWebSocketHandler

```php
public HttpServer::addWebSocketHandler(callable $handler): static
```

注册一个基于 RFC 6455 的全双工 WebSocket 连接处理程序。接受来自 HTTP/1.1 的升级，
也接受来自 HTTP/2（RFC 8441 Extended CONNECT）的升级，此外还支持基于 TLS 的
`wss://` 和 permessage-deflate（RFC 7692）。每个连接由自己的协程处理。

支持两种签名；服务器会检测处理程序声明的参数数量：

```php
function (WebSocket $ws): void
function (WebSocket $ws, HttpRequest $req, WebSocketUpgrade $upgrade): void
```

两参数形式（仅 `$ws`）以默认设置接受升级。三参数形式则可以访问
`WebSocketUpgrade`：子协议协商，以及在 `101` 响应发出之前拒绝升级的能力。

参见 [WebSocket 指南](/zh/docs/server/websocket.html)和
[`WebSocket` 类参考](/zh/docs/reference/server/websocket.html)。

### addHttp2Handler

```php
public HttpServer::addHttp2Handler(callable $handler): static
```

📋 规划中。目前 HTTP/2 请求由 `addHttpHandler` 接收（共用 H1/H2 dispatcher）。

### addGrpcHandler

```php
public HttpServer::addGrpcHandler(callable $handler): static
```

📋 规划中。基于 HTTP/2，支持 unary 和 streaming RPC。

### start

```php
public HttpServer::start(): bool
```

启动服务器并阻塞当前线程，直到 `stop()` 或致命错误。

- `setWorkers(1)` —— 在调用线程上跑 event-loop。
- `setWorkers(N > 1)` —— 启动 N 个 worker 的 `Async\ThreadPool` 并 `await` 它们结束。

正常停止返回 `true`。启动错误（bind 失败、声明了 `addHttp3Listener` 但构建未启用 HTTP/3 等）
抛 `HttpServerException`（及其子类）。

### stop

```php
public HttpServer::stop(): bool
```

优雅停机：

1. 停止接收新连接。
2. 等待活跃请求完成（不超过 `setShutdownTimeout()`）。
3. 关闭所有连接。

成功停止返回 `true`。

> 跨线程的 `stop()` 在路线图里。当前更常用 SIGINT/SIGTERM 触发停止。

### isRunning

```php
public HttpServer::isRunning(): bool
```

### getConfig

```php
public HttpServer::getConfig(): HttpServerConfig
```

返回构造时传入的**同一个**配置对象。服务器启动后，配置已锁定（`isLocked() === true`）。

### getHttp3Stats

```php
public HttpServer::getHttp3Stats(): array
```

HTTP/3 的 per-listener 可观测性。每个 `addHttp3Listener()` 一条，按注册顺序。每条包含：

| 键 | 含义 |
|----|------|
| `host` | 绑定 host |
| `port` | UDP 端口 |
| `datagrams_received` | 收到的数据报数量 |
| `bytes_received` | 接收字节数 |
| `datagrams_errored` | 出错的数据报数 |
| `last_datagram_size` | 最后一个数据报的大小 |
| `last_peer` | 最近的 peer（字符串） |

扩展构建时**未启用** `--enable-http3` 时返回空数组。

### getRuntimeStats

```php
public HttpServer::getRuntimeStats(): array
```

服务器内部分配器的快照。便于把 RSS 增长归因到具体子系统。

| 键 | 含义 |
|----|------|
| `conn_arena_live` | 当前在用的 `http_connection_t` 槽位数（每个 live TCP 连接一个） |
| `conn_arena_slots` | chunk 内的槽位总数（live + free，不会 shrink） |
| `conn_arena_chunks` | 提交的 chunk 数；每个 = `CONN_ARENA_CHUNK_SLOTS` (256) 个 ~768 B 的结构 |
| `conn_arena_bytes` | `chunks × 256 × sizeof(http_connection_t)` —— 虚拟承诺 |
| `body_pool` | 大型 request body 按 size class 划分的 LIFO（1 MB..128 MB）。每条：`slot_bytes`、`count`、`bytes` |
| `body_pool_total_bytes` | 所有 size class 的 `bytes` 汇总 |

### getTelemetry

```php
public HttpServer::getTelemetry(): array
```

📋 规划中。

### resetTelemetry

```php
public HttpServer::resetTelemetry(): bool
```

📋 规划中。

## 示例

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

## 也可参考

- [`TrueAsync\HttpServerConfig`](/zh/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/zh/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/zh/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/zh/docs/reference/server/websocket.html)
- [快速开始](/zh/docs/server/quickstart.html)
