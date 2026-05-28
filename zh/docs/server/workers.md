---
layout: docs
lang: zh
path_key: "/docs/server/workers.html"
nav_active: docs
permalink: /zh/docs/server/workers.html
page_title: "TrueAsync Server：多 worker 与 bootloader"
description: "setWorkers(N)：基于 Async\\ThreadPool 的内置线程池。Bootloader、SO_REUSEPORT、per-request scope、request_context()。"
---

# Multi-worker

(PHP 8.6+, true_async_server 0.6+)

TrueAsync Server 默认运行在**单线程**模式：一个 event-loop、一个线程，整个流水线
（accept → parse → dispatch → respond）都在同一颗 CPU 上。对典型的 IO 密集型负载这是最快的模型，
但它无法按核数横向扩展。

`setWorkers(N)` 通过 [`Async\ThreadPool`](/zh/docs/components/thread-pool.html) 启动一个 N 线程的
内置池。每个 worker 在相同的 listener 上重新 bind，内核（Linux/BSD）通过 `SO_REUSEPORT`
分发 accept。每个 worker 拥有独立的 event-loop、独立的 opcache、独立的连接池。

## 基础示例

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(4)
);

$server->addHttpHandler(function ($req, $res) {
    $res->json(['pid' => getmypid(), 'tid' => /* TID */]);
});

$server->start();   // 阻塞直到所有 worker 都结束
```

父进程里 `HttpServer::start()` 做的事：

1. 起一个对应大小的 `Async\ThreadPool`。
2. 通过 `transfer_obj` 把 config + 处理程序集合复制到每个 worker。
3. 在 worker 里启动 event-loop，重新 bind listener。
4. 父进程 `await` 所有 worker 结束。

跨线程的 `stop()` 还在路线图里；当前可以靠 SIGINT/SIGTERM 或正常的工作耗尽来停止。

## Bootloader

worker 的重型初始化（autoload、连接池预热、JIT 预热）应该在启动时**做一次**，而不是每请求做。
为此提供了 `setBootloader(?\Closure $cb)`：

```php
$config
    ->setWorkers(4)
    ->setBootloader(function () {
        // 每个 worker 在任务循环之前执行一次
        require __DIR__ . '/vendor/autoload.php';

        // 预热连接池
        Database::initPool(min: 4, max: 16);

        // 预编译关键路由
        Router::compile();
    });
```

闭包会被 deep-copy 一次，并在每个 worker 真正开始接受任务之前运行。
**bootloader 中抛出的异常会使整个池失败**：该 worker 不会启动。

只在 `setWorkers() > 1` 时生效。`null` 取消 bootloader。

> 需要 TrueAsync ABI v0.15+。测试：`server/core/021-bootloader.phpt`。

## Per-request scope

从 0.6.5 起，每个 handler 协程都跑在**自己的 scope** 中，作为服务器 scope 的子 scope。
这带来两条重要语义：

- [`Async\request_context()`](/zh/docs/reference/request-context.html) 是整个请求协程树
  （handler 与子级 `spawn`）共享的上下文。
- [`Async\current_context()`](/zh/docs/reference/current-context.html) 仍然是 per-coroutine 的。

```php
use function Async\spawn;
use function Async\await;
use function Async\request_context;

$server->addHttpHandler(function ($req, $res) {
    // 整棵请求协程树都能看到的上下文
    request_context()->set('request_id', $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8)));
    request_context()->set('user_id', authUser($req));

    // Fan-out
    [$user, $posts] = await(\Async\all([
        spawn(fn() => fetchUser()),   // 这里看得到 request_id
        spawn(fn() => fetchPosts()),  // 这里也看得到
    ]));

    $res->json(['user' => $user, 'posts' => $posts]);
});
```

对比一下：`current_context()` 写入的值**只在**当前协程可见；
`request_context()` 给出一个绑定到请求 scope 的共享 sub-tree。

## SO_REUSEPORT 与负载均衡

在 Linux/BSD 上，内核会把入站连接均匀（但不确定）地分发给所有在同一 `(host, port)` 上
带 `SO_REUSEPORT` 打开的 socket。每个 worker 开自己的 socket；不需要 userspace 的负载均衡器，
也不需要锁。

Windows 上 `SO_REUSEPORT` 的等价能力可预测性更差；可以把负载均衡上移到 LB，
或者用 single-worker + 多进程不同端口的方式。

## 跨线程 transfer 处理程序

如果配置在一个线程里搭建、服务器在另一个线程里启动，`HttpServer` 支持 transfer。从 0.2.0 起，
transfer 路径会正确携带协议位掩码（修复了 "silently dropped every request" 的 bug；
参考 CHANGELOG `core/007-server-transfer-handler-dispatch.phpt`）。

## 多线程模式的调试

0.6.3 加了 worker 意外退出的高声日志。`$server->start()` 的未捕获异常以及在 await-loop
还在等 worker 时的 clean return，现在都会输出到 stderr（以前每出一次就静悄悄丢掉 1/N 的
accept 容量，运维毫无信号）。

打开 INFO 日志：

```php
$config
    ->setLogSeverity(\TrueAsync\LogSeverity::INFO)
    ->setLogStream(STDERR);
```

## 该用多少 worker？

经验法则：

- **IO 密集型**（带数据库/HTTP 的常规 web）：从 `available_parallelism()` 起步，盯着 CPU 使用率调。
- **CPU 密集型**（渲染、压缩重活、大 JSON）：`available_parallelism()` 或更少，盯着 p99 调。
- **混合**：超配 1–2 个 worker（`N+1` 或 `N+2`）常能在 IO-stall 时榨出更多核心利用率。

```php
$config->setWorkers(\Async\available_parallelism());
```

> `Async\available_parallelism()` 返回进程可用的 CPU 数（考虑 cgroup 配额和 affinity）。
> 底层走 `uv_available_parallelism`，回退到 `uv_cpu_info`。

## 也可参考

- [`HttpServerConfig::setWorkers()`](/zh/docs/reference/server/http-server-config.html#setworkers)
- [`HttpServerConfig::setBootloader()`](/zh/docs/reference/server/http-server-config.html#setbootloader)
- [`Async\ThreadPool`](/zh/docs/components/thread-pool.html)：池的内部细节
- [`Async\request_context()`](/zh/docs/reference/request-context.html)
- [Backpressure / drain](/zh/docs/server/configuration.html#优雅排空step-8)
