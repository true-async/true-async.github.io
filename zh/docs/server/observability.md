---
layout: docs
lang: zh
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /zh/docs/server/observability.html
page_title: "TrueAsync Server：可观测性"
description: "跨 worker 的请求统计（getStats）、多 sink 结构化日志（setLogSinks）、OpenTelemetry 访问日志，以及运行时分配器计数器。"
---

# 可观测性

(PHP 8.6+, true_async_server 0.10+)

生产环境中的服务器需要对外暴露三样东西：**它服务了多少请求、状态码是什么**、
**一份可以外送的日志**，以及**每个请求一条的访问记录**。本页覆盖这三者。它们都默认关闭
—— 一台空闲的服务器不用为此付出任何代价。

## 跨 worker 统计：`getStats()`

用 `setStatsEnabled(true)` 主动开启，然后用 `HttpServer::getStats()` 读取聚合结果：

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);          // 必须在 start() 之前设置

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

如果没有启用统计，`getStats()` 会抛异常 —— 关闭时根本不会分配计数器 slab。返回结构：

```php
[
    'enabled'  => true,
    'workers'  => [ 0 => [ /* 单个 worker 的计数器 */ ], 1 => [ … ], … ],
    'reactors' => [ /* 完全在传输 reactor 上服务的请求 */ ],
    'totals'   => [ /* 跨 worker 与 reactor 折叠汇总 */ ],
]
```

采集器真正想要的是 `totals`：

| 计数器 | 含义 |
|--------|------|
| `total_requests` | 每一个完成的请求 |
| `responses_2xx_total` … `responses_5xx_total` | 各自只分类一次，因此四者之和等于 `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | 按协议区分的存活连接数（gauge） |
| `log_records_dropped_total` | 满环丢弃的日志行（见下文） |

每个计数器都按其含义允许的方式合并。单调递增的 totals **相加，并且在 `reload()` 中存活**
—— 退役 worker 的 totals 会被继承，因此采集器不会仅仅因为池发生了轮换就看到计数器倒退。
活跃 gauge 只跨存活的 worker 相加，因此一个已死 worker 最后的连接数不会被当作幽灵继续携带。
读取是 lock-free 的，因此聚合结果在轮换中最多滞后一个 worker。

> **不要在请求处理程序里 close over `$server` 来从内部调用 `getStats()`。**
> 在 worker 池下这会形成 `HttpServer ⇄ handler` 引用环，而把 handler transfer 进 worker
> 会让进程崩溃
> （[true-async/php-async#196](https://github.com/true-async/php-async/issues/196)）。请像上面那样
> 从一个持有 `$server` 的独立协程读取统计 —— 而不是从 handler 里读。

## 结构化日志：`setLogSinks()`

一条日志记录会同时 fan-out 到多个 **sink**，每个 sink 有自己的目的地、格式和 severity 下限：

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    // 结构化访问日志 -> 文件，以 OpenTelemetry JSON 格式
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    // 人类可读的诊断 -> 控制台，带颜色
    ['type' => 'stderr', 'format' => 'pretty',
     'category' => 'app', 'level' => LogSeverity::WARN],
]);
```

它取代了单流的 `setLogSeverity()` / `setLogStream()` 语法糖。最多 8 个 sink；非法的 spec
会在 `setLogSinks()` 时抛异常，而不是在 `start()` 时。

**Sink 类型** —— `stream`、`file`、`stdout`、`stderr`、`syslog`。在 worker 池下请用
`file`（或 `stdout`/`stderr`），绝不要用 `stream`：父进程打开的 PHP stream 资源无法跨进
worker 线程 —— 该 sink 会留在父进程上，并在 worker 里被跳过，启动时给出一条提示。`file`
可行是因为每个 worker 会自己重新打开该路径（append 模式）。

**格式** —— `plain`、`logfmt`、`json`（每行一个 OpenTelemetry-Logs 对象）、`pretty`
（带颜色的控制台行，颜色依据目标 fd 决定，并遵守 `NO_COLOR` / `CLICOLOR_FORCE`），
以及用于自定义布局的 `template`：

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

`{ts}`（ISO-8601）或 `{ts:PATTERN}`，其中 PATTERN 是 `date()` 风格的子集
（`Y y m d H i s v`），此外还有 `{level}`、`{msg}`、`{attrs}`、`{trace}`、`{span}`；
其他内容按字面输出。

**`syslog`** 输出 RFC 5424 —— TCP 上采用 octet-framing（RFC 6587），`udp` / `udg` 上
每个 datagram 一条记录：

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### 访问日志：`'category' => 'access'`

sink 的 `category` 用来路由记录类别：`app`（默认）接收服务器诊断，`access` 恰好接收
**每个完成的请求一条结构化记录**，`all` 两者都接收 —— 这样一份 JSON 访问日志和一个 pretty
诊断控制台就能在同一台服务器上共存。

访问记录使用稳定的 OpenTelemetry HTTP 语义约定。下面是 `json` formatter 输出的一行，
经过美化：

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

在每一条完成路径上都会发出 —— handler 返回、静态文件、`sendFile()`、压缩拒绝、
reactor-pool dispatch —— 覆盖 HTTP/1、HTTP/2 和 HTTP/3，也包括 worker 池下。当请求携带了
W3C trace context 时会一并附上。文本 formatter 会转义值中的控制字节，因此源自请求的字段
无法伪造出一行日志。

### 没有任何 sink 会回调进 PHP

记录是从 libuv 的 IO 回调、以及没有 PHP 上下文的 HTTP/3 reactor 线程里发出的，所以日志路径
绝不能重新进入 VM —— 按设计根本没有"调用 PHP callable"这种 sink。要从用户态导出日志，
请把一个 sink 指向文件或 socket 并用 `'format' => 'json'`，然后从你自己的协程里把它 drain
出来。这就是 async-appender 的形态，同时它也把导出器的延迟挡在了请求路径之外。

sink 的环是有界的 —— 生产者绝不能阻塞 —— 因此一次超过写入者速度的突发会付出丢记录的代价。
这些会被计入 `log_records_dropped_total`（见上文 `getStats()`），而不是被悄悄丢弃。

## 运行时分配器计数器：`getRuntimeStats()`

`HttpServer::getRuntimeStats()` 报告服务器自己的内部分配器和跨 worker 的 topic 流量 ——
这些计数器让你能把 RSS 归因到某个子系统，而不用靠猜：

- `conn_arena_live` / `conn_arena_slots` / `conn_arena_chunks` / `conn_arena_bytes` ——
  连接 slab（每个存活的 TCP 连接一个 `http_connection_t`）。
- `body_pool` —— 大请求体按 size-class 分类的缓存，附带 `body_pool_total_bytes`。
- `ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped` —— 跨 worker 的
  [WebSocket topic](/zh/docs/server/websocket.html#topics-publishsubscribe-across-every-worker)
  投递：交给其他 worker 的 publish、兴趣过滤器让 publisher 得以跳过的 worker，以及因 mailbox
  满而丢弃的 publish（最后一项是数据丢失）。

与 `getStats()` 不同，这个不需要主动开启。

## HTTP/3 计数器：`getHttp3Stats()`

每个 HTTP/3 listener 一条，带 per-listener 的 QUIC 计数器（`quic_packets_sent`、
`quic_bytes_sent`、datagram 计数、`poll_rearms`……）。在没有 `--enable-http3` 的构建上
返回空数组。每个计数器都用单独的 relaxed 原子读取，因此即使 reactor 线程还在持续写入，
报告在内部也是自洽的。

## 也可参考

- [Multi-worker](/zh/docs/server/workers.html)：池下的日志与关停
- [配置](/zh/docs/server/configuration.html)
- [`HttpServer::getStats()`](/zh/docs/reference/server/http-server.html)
