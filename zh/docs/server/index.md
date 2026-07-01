---
layout: docs
lang: zh
path_key: "/docs/server/index.html"
nav_active: docs
permalink: /zh/docs/server/index.html
page_title: "TrueAsync Server"
description: "TrueAsync Server —— 原生 PHP 扩展，将 PHP 变成高性能的 HTTP/1.1/2/3 服务器。多协议、TLS 1.2/1.3、压缩、协程，全部在同一进程内完成。"
---

# TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

**TrueAsync Server** 是一个原生 PHP 扩展，它直接在 **PHP 进程内部**运行一个高性能的 HTTP 服务器。
无需独立的守护进程，无需反向代理，也无需 FastCGI 桥接。

开箱即用地支持**在同一个 TCP 端口上同时承载 HTTP/1.1 和 HTTP/2**。协议选择通过 ALPN 协商（TLS 场景）
或 HTTP Upgrade 完成。HTTP/3 工作在同一个 UDP 端口（QUIC）之上，并通过 `Alt-Svc` 响应头向客户端通告。

WebSocket 和 SSE 已经完成，运行在同一个"单 listener + 协议检测"模型上。基于 HTTP/2
的 gRPC 仍在开发中（详见 [路线图](#功能特性)）。

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

## 为什么需要它

**服务器的目标是释放 PHP 并发应用程序的潜力。**

TrueAsync 为 PHP 语言带来了真正的协程、非阻塞 I/O 和连接池。要在生产负载中兑现这一潜力，
就需要一个原生就为这种模型设计的服务器：一个常驻进程，内置 event-loop，每个请求获得自己的协程，
调度器在每次 I/O 等待时在它们之间切换。

TrueAsync Server 正是这样的服务器。协程和网络之间没有任何中间层：
listener、协议解析器、请求分发器和处理程序都生活在同一进程、同一 event-loop 中。
数据库连接通过 `Async\Pool` 复用，opcache 在请求之间保持热态，冷启动开销只在 `start()` 时付一次。

## 功能特性

| 状态 | 功能 | 详情 |
|------|------|------|
| ✅ | **HTTP/1.1** | 完整符合 RFC 9112，支持 keep-alive、pipelining（基于 [llhttp](https://github.com/nodejs/llhttp)，与 Node.js 使用同一个解析器）|
| ✅ | **HTTP/2** | 多路复用、server push（libnghttp2 ≥ 1.57，为 CVE-2023-44487 设置最低版本）|
| ✅ | **HTTP/3 / QUIC** | 基于 libngtcp2 + libnghttp3 的 UDP 传输，OpenSSL 3.5 QUIC TLS API |
| ✅ | **TLS 1.2 / 1.3** | OpenSSL 3.x，ALPN 协商，禁用弱密码套件 |
| ✅ | **压缩** | gzip（zlib-ng / zlib）、Brotli、zstd：覆盖响应压缩与所有协议下的入站请求体解压 |
| ✅ | **Multipart / 文件上传** | 流式零拷贝解析器 |
| ✅ | **Backpressure** | CoDel（RFC 8289），高负载下自适应地暂停 accept |
| ✅ | **流式读取请求体** | 通过 [`HttpRequest::readBody()`](/zh/docs/reference/server/http-request.html) 可选启用；上传无需把整个请求体保留在内存里 |
| ✅ | **sendFile** | 直接从处理程序高效地把磁盘文件发出去 |
| ✅ | **内置 worker pool** | `setWorkers(N)`：通过 `Async\ThreadPool` + `SO_REUSEPORT` 启用 N 个线程 |
| ✅ | **Per-request scope** | 每个处理程序运行在自己的 scope 中；`Async\request_context()` 提供贯穿整个请求协程树的共享上下文 |
| ✅ | **原生协程** | 与 TrueAsync 深度集成：处理程序中任何阻塞 I/O 都只会挂起协程，而不是线程 |
| ✅ | **零拷贝** | 热路径上的内存分配最小化 |
| ✅ | **WebSocket** | RFC 6455，从 HTTP/1.1 和 HTTP/2（RFC 8441 Extended CONNECT）升级、`wss://`、permessage-deflate（RFC 7692）、全双工、backpressure，全部 246 项 Autobahn|Testsuite 测试 |
| ✅ | **SSE** | 在 HTTP/1.1、HTTP/2 和 HTTP/3 上的 `text/event-stream`，同一个处理程序无需区分协议 |
| 📋 | **gRPC** | 基于 HTTP/2，支持 unary 和 streaming |

## 架构：单线程 event loop

与 [NGINX](https://nginx.org)、[Envoy](https://www.envoyproxy.io)、
[Node.js](https://nodejs.org) 以及 Rust [Tokio](https://tokio.rs)/[hyper](https://hyper.rs) 是同一种模型。

**一个线程从 accept 到 send 全程拥有连接与请求。**
没有 accept 线程到 worker 线程之间的传递，没有锁，也没有它们之间的上下文切换。
单个 event-loop 接受连接、从套接字读字节、解析 HTTP、将请求分发到处理程序、写出响应，
全程不离开当前线程。

```
       ┌─────────────────────────────────────────┐
       │              Event Loop Thread          │
       │                                         │
accept ─►  parse  ─►  dispatch  ─►  respond      │
       │     ▲                        │          │
       │     └──── coroutine yield ◄──┘          │
       └─────────────────────────────────────────┘
```

非阻塞 I/O 由 **libuv 反应器**（通过 TrueAsync）实现。当协程需要等待文件、数据库
或下一个 WebSocket 帧时，它把控制权交还给 event-loop，event-loop 立刻拾起下一个就绪事件。
线程绝不会空转在 `read()`/`recv()` 上。

横向扩展到多核时使用 **multi-worker** 模式，通过
[`setWorkers(N)`](/zh/docs/reference/server/http-server-config.html#setworkers)：
内置的 `Async\ThreadPool` 会启动 N 个 OS 线程，每个线程拥有独立的 event-loop，
然后由内核（Linux/BSD）通过 `SO_REUSEPORT` 在它们之间分发入站连接。
没有共享状态，没有全局锁。

## 从哪里开始

- [快速开始](/zh/docs/server/quickstart.html)：5 分钟完成安装和最小示例
- [配置](/zh/docs/server/configuration.html)：listeners、workers、TLS、超时、body streaming、bootloader
- [压缩](/zh/docs/server/compression.html)：gzip / brotli / zstd、协商、BREACH
- [静态文件与 sendFile](/zh/docs/server/static-files.html)：`StaticHandler`、预压缩 sidecar、Range
- [流式传输](/zh/docs/server/streaming.html)：请求体流式读取与响应体流式发送
- [SSE](/zh/docs/server/sse.html)：Server-Sent Events、`sseEvent()`、重连、心跳
- [WebSocket](/zh/docs/server/websocket.html)：全双工连接、backpressure、keepalive
- [多工作进程](/zh/docs/server/workers.html)：`setWorkers(N)`、bootloader、per-request scope
- [示例](/zh/docs/server/examples.html)：JSON-API、静态文件、fan-out、multipart 上传
- [架构](/zh/architecture/server.html)：内部细节

### API 参考

- [`TrueAsync\HttpServer`](/zh/docs/reference/server/http-server.html)
- [`TrueAsync\HttpServerConfig`](/zh/docs/reference/server/http-server-config.html)
- [`TrueAsync\HttpRequest`](/zh/docs/reference/server/http-request.html)
- [`TrueAsync\HttpResponse`](/zh/docs/reference/server/http-response.html)
- [`TrueAsync\WebSocket`](/zh/docs/reference/server/websocket.html)
- [`TrueAsync\StaticHandler`](/zh/docs/reference/server/static-handler.html)
- [`TrueAsync\SendFileOptions`](/zh/docs/reference/server/send-file-options.html)
- [`TrueAsync\UploadedFile`](/zh/docs/reference/server/uploaded-file.html)
- [`TrueAsync\LogSeverity`](/zh/docs/reference/server/log-severity.html)
- [异常](/zh/docs/reference/server/exceptions.html)

## 替代方案

[FrankenPHP](/zh/docs/frankenphp.html) 是基于 Caddy/Go 的独立可嵌入服务器，PHP 在其中作为 worker。
当你需要 Caddy 的功能（自动 Let's Encrypt、通过 Caddyfile 配置）或者要集成到已有的 Caddy 基础设施时，
它会很方便。TrueAsync Server 则是不依赖 Go runtime 的原生替代方案：服务器直接生活在 PHP 进程内。
