---
layout: docs
lang: zh
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /zh/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() —— 1/5/15 分钟系统 load average。POSIX 平台返回数组，Windows 返回 null。"
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()` 返回最近 1、5、15 分钟的系统 load average；若平台不支持（Windows）则返回 `null`。

## 描述

```php
namespace Async;

function loadavg(): ?array
```

Load average 是内核 run-queue 的平均长度。它与 CPU 利用率是**两个不同的指标**：
在 4 核机器上稳定 load 4.0 意味着 run-queue 平均处于满载。

## 返回值

`array{0: float, 1: float, 2: float}` —— `[1min, 5min, 15min]`。Windows 上返回 `null`。

## 示例

### 示例 #1 基本用法

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "本平台无 load average\n";
}
```

### 示例 #2 过载告警

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\loadavg;
use function Async\available_parallelism;

spawn(function () {
    $cpu = available_parallelism();
    while (true) {
        delay(60_000);
        $load = loadavg();
        if ($load === null) continue;

        // 5 分钟 load 高于可用 CPU 数 = 持续过载。
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## 备注

> **Load average ≠ CPU usage**。机器 CPU 用量很低但 load 很高，通常意味着 I/O 密集型负载
> （进程卡在 `D` 状态等磁盘/网络）。判断 CPU 时优先用
> [`cpu_usage()`](/zh/docs/reference/cpu-usage.html)。

> **Windows**。Windows 没有 load average 概念（BSD/Linux 专属）。函数返回 `null` 是有意为之，
> 不做模拟。

## 也可参考

- [Async\\cpu_usage()](/zh/docs/reference/cpu-usage.html) —— 进程与系统当前 CPU 负载
- [Async\\available_parallelism()](/zh/docs/reference/available-parallelism.html) —— 可用 CPU 数
- [Async\\CpuSnapshot](/zh/docs/reference/cpu-snapshot.html) —— 低层 CPU 计数器
