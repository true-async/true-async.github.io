---
layout: docs
lang: zh
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /zh/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() —— 返回当前进程可用的 CPU 数，考虑 cgroup 配额、affinity 和容器限制。"
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()` 返回**当前进程**可用的 CPU 数。

## 描述

```php
namespace Async;

function available_parallelism(): int
```

考虑 cgroup CPU 配额、`sched_setaffinity` 等限制。这正是 libuv 推荐用作 thread pool / worker pool
规模的数值。始终 `>= 1`。

在 `cpu.max=2` 的容器里，函数返回 `2`，而不是宿主机的物理核数。
裸金属上 —— 返回逻辑核数，扣掉 affinity 限制（如果设置了）。

底层：`uv_available_parallelism()`，回退到 `uv_cpu_info`。

## 返回值

`int` —— CPU 数，保证 `>= 1`。

## 示例

### 示例 #1 按可用 CPU 设置池大小

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// 惯用做法：ThreadPool 自身在 workers=0 时已经会自动检测，
// 但当你想用同样的值调别的东西时，显式调用就有用。
$pool = new ThreadPool(workers: available_parallelism());
```

### 示例 #2 HTTP 服务器的 worker pool 大小

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\available_parallelism;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
        ->setWorkers(available_parallelism())
);

$server->start();
```

### 示例 #3 诊断运行环境

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// Docker `--cpus=2` → 2
// 16 核宿主机无限制 → 16
// Kubernetes pod 限 cpu=1 → 1
```

## 备注

> **提示：** `ThreadPool` 和 `HttpServer::setWorkers()` 的池大小完全可以不手动调用本函数 ——
> 把池大小填 `0`，两者都会自动用 `available_parallelism()`。

> 大多数 IO 密集型负载下，超配为 `N + 1` 或 `N + 2` 是合理的 —— 因为部分 worker 会被 I/O 阻住。

## 也可参考

- [Async\\ThreadPool](/zh/docs/components/thread-pool.html) —— 自动使用该值
- [Async\\cpu_usage()](/zh/docs/reference/cpu-usage.html) —— 进程与系统当前 CPU 负载
- [Async\\loadavg()](/zh/docs/reference/loadavg.html) —— run-queue 平均长度
