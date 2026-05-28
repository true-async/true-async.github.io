---
layout: architecture
lang: zh
path_key: "/architecture/server.html"
nav_active: architecture
permalink: /zh/architecture/server.html
page_title: "TrueAsync Server 架构"
description: "TrueAsync Server 内部细节：单线程 event loop、zero-copy、CoDel、bailout firewall、通过 SO_REUSEPORT 的多 worker。"
---

# TrueAsync Server 架构

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server 是用 C 写的原生 PHP 扩展，把 HTTP 服务器直接跑在 PHP 进程的地址空间里。
架构上它是一个**单线程 event loop**，可选地以**复制式 worker pool** 在同一进程内做横向扩展。

## 全景

```
            ┌────────────────────────────────────────────────────────────┐
            │                       PHP 进程                              │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop 线程 #0                    │ │
            │   │                                                      │ │
            │   │   libuv ──► accept ──► parse ──► dispatch ──► send   │ │
            │   │     ▲                                ▼                │ │
            │   │     │     ┌──── PHP 处理程序（协程）─────┐             │ │
            │   │     │     │  用户代码、DB、HTTP 客户端…  │             │ │
            │   │     │     └─────────────┬───────────────┘             │ │
            │   │     └──────── yield ────┘                            │ │
            │   └──────────────────────────────────────────────────────┘ │
            │                                                            │
            │   ┌──────────────────────────────────────────────────────┐ │
            │   │                Event-loop 线程 #1 …N-1               │ │
            │   │   （当 setWorkers(N>1)，配合 SO_REUSEPORT）           │ │
            │   └──────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────┘
```

一个线程从 accept 到最终 send 全程持有连接与请求。没有 accept → worker 的 handoff，
没有 per-request 的 fork/cleanup，也没有全局锁。当处理程序需要等 I/O（DB、HTTP、文件）时，
协程让出 event-loop，它立刻挑下一个就绪事件。

## 分层

### 1. Reactor：libuv

底层 I/O 通过 [TrueAsync ABI](/zh/architecture/zend-async-api.html) 走 libuv。
TCP accept、UDP recvmmsg、文件操作、定时器、sigwait —— 都通过统一接口 `zend_async_event_t`。
reactor 知道 epoll/kqueue/IOCP，服务器并不知道。

关键扩展 API：

- `zend_async_io_*` —— 非阻塞 socket 与文件读写。
- `zend_async_io_sendfile_t` —— `uv_fs_sendfile`（Linux/BSD 是 `sendfile`，Windows 是 `TransmitFile`）。
- `zend_async_fs_open_t` —— 通过 libuv thread pool 的异步 `open(2)`。
- `udp_bind`，用于 HTTP/3 / QUIC。

### 2. 协议解析器

- **HTTP/1.1**：vendored 的 [`llhttp`](https://github.com/nodejs/llhttp) 9.3.0（与 Node.js 同款解析器）。
- **HTTP/2**：`libnghttp2` ≥ 1.57（为 CVE-2023-44487 rapid-reset 设的下限）。
- **HTTP/3 / QUIC**：`libngtcp2` + `libnghttp3`，OpenSSL 3.5 QUIC TLS API
  （后端 `libngtcp2_crypto_ossl`）。

单 TCP socket 上的协议识别：

- 明文：preface `PRI * HTTP/2.0\r\n...\r\n` → HTTP/2（h2c），否则 → llhttp。
- TLS：握手时通过 ALPN 协商。

`HttpServer::addListener()` 建立的是多协议 listener。要限制具体协议的端口，用
`addHttp1Listener` / `addHttp2Listener` / `addHttp3Listener`。

### 3. 连接 arena

`http_connection_t` —— per-connection 状态（768 B）。放在 slab pool 里：chunk 每块
`CONN_ARENA_CHUNK_SLOTS`（256）个槽。Live/free 用 bitmap 跟踪；chunk 永不 shrink，
这样能获得热 arena 命中而不需要分配。

通过 [`HttpServer::getRuntimeStats()`](/zh/docs/reference/server/http-server.html#getruntimestats) 可见：
`conn_arena_live`、`conn_arena_slots`、`conn_arena_chunks`、`conn_arena_bytes`。

### 4. Body pool

per-thread LIFO，用于大型 request body 缓冲（≥ 1 MB）。该尺寸的 body 通过 `zend_mm` 分配，
但**归还**时不进分配器，而是进 per-size-class LIFO。下一个同 size-class 的请求复用该槽位，
省掉 `mmap`/`munmap` 流量，也避开 `mmap_lock` 争抢 —— 后者过去在上传重的负载上压制了
multi-worker 扩展性。

bench（W=8，c=128，2 MiB POST body）：1500 RPS / 370% CPU → **3300 RPS / 720% CPU**
（吞吐 ×2.2；CPU 现在能真正随 worker 数量扩展）。

在 `HttpServer::stop()` 和 RSHUTDOWN 时排空。debug 构建下，zend_mm 泄漏检测器在 module unload 时
看到的是 clean slate。

### 5. 协程集成

每个接受的请求通过 `ZEND_ASYNC_NEW_COROUTINE` 派生新协程。
协程在 **per-request scope** 下运行，作为服务器 scope 的子级。这带来两个效果：

- `Async\request_context()` 解析为整棵请求协程子树共享的上下文。
- `Async\current_context()` 仍是 per-coroutine 的。

请求取消（handler 协程被取消 → 4xx parser 限制、stream peer reset、drain 超时）通过正常的
`AsyncCancellation` 链路传播。`TrueAsync\HttpException extends AsyncCancellation` 携带 HTTP 状态，
让 dispatcher 知道该回客户端什么。

### 6. Multi-worker（可选）

`HttpServerConfig::setWorkers(N > 1)` 时：

1. 父进程启动 N 大小的 `Async\ThreadPool`。
2. 通过 `transfer_obj` 把 config + handler set 复制到每个 worker（整张图 deep copy，
   包括闭包的 op_array；参见 [Thread snapshot](/zh/architecture/zend-async-api.html)）。
3. worker 用 `SO_REUSEPORT` 在相同 listener 上重新 bind。
4. 内核（Linux/BSD）均匀地把 accept 分到同一 reuse-port 组的 socket 上。
5. 父进程的 `start()` 等所有 worker 结束。

每个 worker 拥有独立的 event-loop、opcache 和分配器。没有共享状态，没有锁。
bootloader（如有）在每个 worker 启动 task loop 之前执行一次。

## CoDel backpressure

服务器实现了 [CoDel](https://datatracker.ietf.org/doc/html/rfc8289)，按 sojourn 时间做自适应 backpressure：

- 每个请求都打上 enqueue → dequeue 的时间戳。
- 如果 sojourn（queue-wait）**连续 100 ms** 高于 `setBackpressureTargetMs()`（默认 5 ms），
  listen socket 被暂停。
- sojourn 一旦回落，listen 立即恢复。

与硬 `max_connections` 不同，CoDel **跟踪管道上的真实负载**，而不仅是并发连接数。
这对 HTTP/2 尤其重要 —— 单连接可以承载任意数量 stream。

为了照顾选择性的工作负载，CoDel 默认是关的：0.3.0 之后出现过 CoDel 误触发的情况
（短促的快流把连接推到 "overloaded"，把无关的长流也 park 住了），最后选择了保守默认。

## Bailout firewall

用户 handler 抛的 PHP 致命错误（E_ERROR、OOM、shutdown 期间的 uncaught）**不会击垮服务器**。
H1/H2/H3 各自的协议入口都把 handler 的调用包裹在 bailout fence 里：

1. 排空失败的协程。
2. 给客户端发 500（如果响应头还没出去）。
3. 把控制权交回 listener，它继续 accept。

诊断：失败路径上服务器会输出 C 栈（如果有 `<execinfo.h>`；由 `HAVE_EXECINFO_H` gate）以及
PHP 级 `zend_error`。在 musl / Windows 上，C 帧 dump 会被静默跳过。

仓库里 [`docs/118-tracing-jit-stale-fp-spill.md`](https://github.com/true-async/server/tree/main/docs)
是一个早期 Tracing-JIT 下 bailout bug 的记录。

## 连接排空（Step 8）

服务器实现了两种 drain 模型：

### 主动：`setMaxConnectionAgeMs()`

寿命到 `(age ± 10% jitter)` 后向连接发出信号：

- H1：下一次响应带 `Connection: close`。
- H2：发 `GOAWAY`。

对应 gRPC 的 `MAX_CONNECTION_AGE`。防止在 L4-LB 背后长连接"粘"到某个 worker 上。

### 被动：CoDel trip / hard-cap 切换

服务器进入 overload（CoDel 暂停或撞到 `max_connections`）时，per-connection 的 drain 效果
按 `setDrainSpreadMs()` 窗口分散（对应 HAProxy 的 `close-spread-time`），避免客户端重连惊群。

触发之间的最小间隔由 `setDrainCooldownMs()` 控制（默认 10 秒）。

## Zero-copy 热路径

- **H2 over TLS 混合发送**（0.6.2）：小响应走 DRAIN 路径（mem_send + `BIO_write`，
  不做 gather 分配）；大于 2 KiB 的 body 或流式走 GATHER（NO_COPY refs + 一次 `SSL_write_ex`）。
  bench：h2load 矩阵中的 best-of-three。
- **静态小文件快速路径**（≤ 64 KiB）：把文件 slurp 到 `zend_string`，一次
  `writev(headers + body)` 发出。> 64 KiB 走 sendfile。
- **静态文件的内联 `open`/`fstat`**：warm dentry cache 时不走 libuv thread pool 的 futex 来回。

## 内存模型

服务器有意压低 RAM 占用：

- **非对称 TLS BIO ring 大小**（0.6.0）：CT-in 17 KiB、PT-app 反向通道 17 KiB，其它保持不变；
  每个 TLS 连接省下约 62 KiB。
- **Body pool**（见上）：复用大 body。
- **请求体流式**：50 个并发 20 MiB POST 上峰值 RSS 从 1170 MiB 降到 **197 MiB**。
- **静态 TSRMLS 缓存**（ext/async 0.7.0）：`-DZEND_ENABLE_STATIC_TSRMLS_CACHE=1` 把
  `EG()` / `ASYNC_G()` 变成一次 `__thread` 取址，而非 `pthread_getspecific`。在极小 HTTP handler 上 +32% RPS。

## RFC 合规

- HTTP/1.1：完整符合 RFC 9112（自 0.6.3 起按 §9.6 镜像 `Connection: close` 应答）。
- HTTP/2：RFC 9113，针对 CVE-2023-44487 的 rapid-reset 缓解。
- HTTP/3：RFC 9114，QUIC RFC 9000，包括 connection ID 轮换与放大限制。
- TLS：仅 TLS 1.2/1.3，OpenSSL 3.x；HTTP/3 需要 OpenSSL 3.5+。
- WebSocket / SSE / gRPC：规划中。

## 也可参考

- [TrueAsync ABI](/zh/architecture/zend-async-api.html)
- [Scheduler 与 Reactor](/zh/architecture/scheduler-reactor.html)
- [服务器配置](/zh/docs/server/configuration.html)
- [Multi-worker](/zh/docs/server/workers.html)
