---
layout: docs
lang: zh
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /zh/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() —— 进程与系统的当前 CPU 负载，自动计算两次调用之间的差值。适合做遥测循环。"
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()` 返回自上次调用以来的 CPU 占用，并已经换算为百分比。适合放在遥测循环里。

## 描述

```php
namespace Async;

function cpu_usage(): array
```

函数在**每个进程**内维护一份内部的"上次"CPU 计数器快照。首次调用保存快照并返回 0；
之后每次调用返回与上次快照的差值，并替换掉快照。

## 返回值

关联数组：

| 键 | 类型 | 含义 |
|----|------|------|
| `process_cores` | `float` | 进程平均占用的核数（`0..cpuCount`）。多核系数。 |
| `process_percent` | `float` | 占总机器容量的百分比，`0..100`。 |
| `system_percent` | `float` | 宿主机整体 CPU 利用率，`0..100`。 |
| `cpu_count` | `int` | OS 可见的逻辑 CPU 数。 |
| `interval_sec` | `float` | 两次快照之间的 wall-clock 秒数。 |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | 1/5/15 分钟 load average；Windows 上为 `null`。 |

> 在容器内，`system_percent` 反映的是**宿主机**，而不是 cgroup。做 per-process backpressure 时
> 优先用 `process_cores` / `process_percent` —— 它们正确处理 affinity 和 cgroup CPU 限流。

## 示例

### 示例 #1 每秒输出负载

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // 首次调用只是"预热"内部快照，返回零。
    cpu_usage();

    while (true) {
        delay(1000);
        $u = cpu_usage();
        printf(
            "[CPU] proc %.2f cores (%.1f%%), system %.1f%%, interval %.3fs\n",
            $u['process_cores'],
            $u['process_percent'],
            $u['system_percent'],
            $u['interval_sec'],
        );
    }
});
```

### 示例 #2 基于进程负载的 backpressure

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // 在进程占自身容量 > 90% 时不再接新任务。
    return $u['process_percent'] < 90.0;
}
```

### 示例 #3 健康检查端点

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\cpu_usage;
use function Async\loadavg;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    if ($req->getPath() === '/healthz') {
        $u = cpu_usage();
        $res->json([
            'cpu' => $u,
            'load' => loadavg(),
        ]);
        return;
    }
    $res->setStatusCode(404);
});

$server->start();
```

## 备注

> **状态是进程级全局的。** 如果需要多个独立的遥测消费者（例如不同子系统各算自己的差值），
> 用 [`CpuSnapshot::now()`](/zh/docs/reference/cpu-snapshot.html) 手动取快照，自己算差值。

## 也可参考

- [Async\\CpuSnapshot](/zh/docs/reference/cpu-snapshot.html) —— CPU 计数器的低层快照
- [Async\\loadavg()](/zh/docs/reference/loadavg.html) —— 1/5/15 分钟 load average
- [Async\\available_parallelism()](/zh/docs/reference/available-parallelism.html) —— 可用 CPU 数
