---
layout: docs
lang: zh
path_key: "/docs/server/observability.html"
nav_active: docs
permalink: /zh/docs/server/observability.html
page_title: "TrueAsync Server：可观测性"
description: "用 getStats() 查看请求统计，用 Prometheus /metrics 端点和 Grafana 展示，用 setLogSinks() 做结构化日志和访问日志，以及运行时计数器。"
---

# 可观测性

(PHP 8.6+, true_async_server 0.10+)

服务器可以报告请求统计、写结构化日志，并为每个请求生成一条访问记录。本页讲的这些默认都是关闭的。

## 请求统计：`getStats()`

用 `setStatsEnabled(true)` 打开统计，然后用 `getStats()` 读取：

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);
$server->addHttpHandler(fn ($req, $res) => $res->json(['ok' => true]));

$server->start();
```

`getStats()` 返回每个 worker 的计数器和一份合计。如果没有打开统计，它会抛异常。

```php
[
    'enabled' => true,
    'workers' => [ 0 => [ /* 一个 worker 的计数器 */ ], 1 => [ … ] ],
    'totals'  => [ /* 跨 worker 求和 */ ],
]
```

`totals` 里有：

| 计数器 | 含义 |
|--------|------|
| `total_requests` | 已完成的请求数 |
| `responses_2xx_total` … `responses_5xx_total` | 按状态类别分的响应数；这四项之和等于 `total_requests` |
| `conns_active_h1` / `_h2` / `_h3` | 按协议分的存活连接数 |

合计会跨 `reload()` 继续累加；连接计数器只统计当前存活的 worker。

## Prometheus 和 Grafana

服务器本身不提供 `/metrics` 端点 —— `getStats()` 给你的是一个普通 PHP 数组，你把它转成监控系统需要的格式。对 Prometheus 来说，只要写一个小 handler，把数组格式化成[文本暴露格式](https://prometheus.io/docs/instrumenting/exposition_formats/)：

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(4)
    ->setStatsEnabled(true);

$server = new HttpServer($config);

$server->addHttpHandler(function ($req, $res) use ($server) {
    if ($req->getPath() === '/metrics') {
        $t = $server->getStats()['totals'];

        $body  = "# HELP http_requests_total Requests completed.\n";
        $body .= "# TYPE http_requests_total counter\n";
        $body .= "http_requests_total {$t['total_requests']}\n";

        $body .= "# HELP http_responses_total Responses by status class.\n";
        $body .= "# TYPE http_responses_total counter\n";
        foreach (['2xx', '3xx', '4xx', '5xx'] as $class) {
            $body .= "http_responses_total{class=\"{$class}\"} {$t["responses_{$class}_total"]}\n";
        }

        $body .= "# HELP http_connections_active Open connections by protocol.\n";
        $body .= "# TYPE http_connections_active gauge\n";
        foreach (['h1', 'h2', 'h3'] as $proto) {
            $body .= "http_connections_active{protocol=\"{$proto}\"} {$t["conns_active_{$proto}"]}\n";
        }

        $res->setHeader('Content-Type', 'text/plain; version=0.0.4')->end($body);
        return;
    }

    $res->json(['ok' => true]);
});

$server->start();
```

让 Prometheus 去抓这个端点：

```yaml
scrape_configs:
  - job_name: 'true-async-server'
    static_configs:
      - targets: ['your-server:8080']
```

这些计数器都放在一张进程级的表里，每个 worker 更新它、`getStats()` 读它，所以抓一次就覆盖了整个池：

![从 worker 汇聚到 Grafana 的指标流](/diagrams/en/server-observability/metrics-flow.svg)

有了这些，Grafana 就能像对待任何 Prometheus 数据源一样，画出请求速率、状态类别和存活连接：

![服务器指标的 Grafana 仪表盘](/diagrams/en/server-observability/grafana-dashboard.png)

## 日志：`setLogSinks()`

`setLogSinks()` 把每条日志记录发到一个或多个目的地，每个目的地有自己的格式和最低级别：

```php
use TrueAsync\LogSeverity;

$config->setLogSinks([
    ['type' => 'file', 'path' => '/var/log/app/access.log',
     'format' => 'json', 'category' => 'access', 'level' => LogSeverity::INFO],

    ['type' => 'stderr', 'format' => 'pretty', 'level' => LogSeverity::WARN],
]);
```

最多 8 个目的地。它取代了单流的 `setLogSeverity()` / `setLogStream()`。

**记录去哪里** —— `type` 是 `file`、`stdout`、`stderr`、`syslog` 或 `stream`。在 worker 池下请用 `file`（或 `stdout` / `stderr`）：父进程打开的 `stream` 资源无法共享给 worker 线程，所以它只在父进程上生效。

**长什么样** —— `format` 是 `plain`、`logfmt`、`json`、`pretty`（带颜色的控制台行）或 `template`：

```php
['type' => 'stdout', 'format' => 'template',
 'template' => '{ts:Y-m-d H:i:s.v} [{level}] {msg}{attrs}', 'level' => LogSeverity::INFO]
```

占位符：`{ts}` 或 `{ts:PATTERN}`（`date()` 风格的 `Y y m d H i s v`）、`{level}`、`{msg}`、`{attrs}`、`{trace}`、`{span}`。其他内容按字面输出。

`syslog` 目的地按 RFC 5424 说话，走 TCP、UDP 或 unix socket：

```php
['type' => 'syslog', 'target' => 'udg:///dev/log',
 'facility' => 'local0', 'level' => LogSeverity::INFO]
```

### 访问日志

用 `category` 决定一个目的地收到什么：`app`（默认）收到服务器诊断，`access` 每个完成的请求收到一条记录，`all` 两者都收。这样一份 JSON 访问日志和一个易读的诊断控制台就能同时运行。

访问记录遵循 OpenTelemetry HTTP 约定。一条 `json` 记录：

```json
{
    "Timestamp": "2026-07-15T07:03:37.740Z",
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

每个请求都会写一条记录，涵盖 HTTP/1、HTTP/2 和 HTTP/3，也包括 worker 池下。如果请求带了 W3C trace context，也会一并包含进去。

## 运行时计数器：`getRuntimeStats()`

`getRuntimeStats()` 报告服务器自己的内存池和跨 worker 的 WebSocket topic 流量 —— 用来把内存增长归因到某个子系统很有用。不需要打开。里面的键包括连接 arena（`conn_arena_*`）、请求体池（`body_pool*`）和 topic 投递（`ws_topic_posted` / `ws_topic_skipped` / `ws_topic_dropped`）。

## HTTP/3 计数器：`getHttp3Stats()`

`getHttp3Stats()` 为每个 HTTP/3 listener 返回一条，带它的 QUIC 计数器（`quic_packets_sent`、`quic_bytes_sent`、datagram 计数等等）。在没有 `--enable-http3` 的构建上返回空数组。

## 也可参考

- [Multi-worker](/zh/docs/server/workers.html)：池下的日志与关停
- [配置](/zh/docs/server/configuration.html)
- [`HttpServer::getStats()`](/zh/docs/reference/server/http-server.html)
