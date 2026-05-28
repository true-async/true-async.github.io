---
layout: docs
lang: zh
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /zh/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot —— 进程与系统 CPU 计数器的不可变快照。可作为自定义差值计算的低层数据源。"
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot` —— 进程与系统 CPU 计数器在某一时刻的不可变快照。

## 什么时候用

高层封装 [`Async\cpu_usage()`](/zh/docs/reference/cpu-usage.html) 在每个进程内维护一份内部快照，
自动算差。多数遥测场景这就够用。

需要 `CpuSnapshot` 的情况：

- 多个独立的遥测消费者各自算自己的差；
- 需要保留原始计数器（写日志、dump、传给其他系统）；
- 想计算 process/system 之外的自定义衍生指标。

## 类概览

```php
namespace Async;

final class CpuSnapshot
{
    public readonly int $wallNs;
    public readonly int $processUserNs;
    public readonly int $processSystemNs;
    public readonly int $systemIdleNs;
    public readonly int $systemBusyNs;
    public readonly int $cpuCount;

    public static function now(): CpuSnapshot;
}
```

所有时间字段都是单调递增的纳秒计数器，起点是 implementation-defined 的。
**单个值本身无意义** —— 必须在两个不同时刻取的快照之间算差。

跨平台：Linux 与 Windows 上字段和语义一致。

## 字段

| 字段 | 类型 | 含义 |
|------|------|------|
| `wallNs` | `int` | 取快照时的 monotonic wall-clock 时间。 |
| `processUserNs` | `int` | 进程所有线程在用户态的累计 CPU 时间。 |
| `processSystemNs` | `int` | 进程所有线程在内核态的累计 CPU 时间。 |
| `systemIdleNs` | `int` | 宿主机所有逻辑 CPU 的累计 idle 时间。 |
| `systemBusyNs` | `int` | 宿主机所有逻辑 CPU 的累计 non-idle 时间（`user + system + nice + irq + softirq + steal`）。 |
| `cpuCount` | `int` | 取快照时 OS 可见的逻辑 CPU 数。 |

> **在容器内**，`systemIdleNs` / `systemBusyNs` 反映的是**宿主机**，不是 cgroup。
> 做 per-process backpressure 时优先用 `process*` 字段 —— 它们会自动考虑 affinity 和 cgroup 限流。

## 方法

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

取一份新快照。

## 示例

### 示例 #1 手动算差

```php
<?php
use Async\CpuSnapshot;
use function Async\spawn;
use function Async\delay;

spawn(function () {
    $prev = CpuSnapshot::now();
    delay(1000);
    $now = CpuSnapshot::now();

    $wall = $now->wallNs  - $prev->wallNs;
    $user = $now->processUserNs   - $prev->processUserNs;
    $sys  = $now->processSystemNs - $prev->processSystemNs;

    // 这段时间内 user + kernel 时间占了多少核。
    $processCores = ($user + $sys) / $wall;

    printf(
        "过去一秒进程平均占用 %.3f 核\n",
        $processCores
    );
});
```

### 示例 #2 两个独立的消费者

```php
<?php
use Async\CpuSnapshot;

class TelemetryReporter
{
    private ?CpuSnapshot $prev = null;

    public function tick(): array
    {
        $now = CpuSnapshot::now();
        if ($this->prev === null) {
            $this->prev = $now;
            return ['process_cores' => 0.0];
        }

        $wall = $now->wallNs - $this->prev->wallNs;
        $cpu  = ($now->processUserNs   - $this->prev->processUserNs)
              + ($now->processSystemNs - $this->prev->processSystemNs);

        $this->prev = $now;
        return ['process_cores' => $wall > 0 ? $cpu / $wall : 0.0];
    }
}

// 两个实例 —— 两条独立的测量序列。
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## 备注

> 类是**不可变**的，并且**不可序列化**（`@strict-properties`、`@not-serializable`）。
> 构造函数私有 —— 实例只能通过 `CpuSnapshot::now()` 创建。

## 也可参考

- [Async\\cpu_usage()](/zh/docs/reference/cpu-usage.html) —— 现成的差值，并已换算成百分比
- [Async\\loadavg()](/zh/docs/reference/loadavg.html) —— 1/5/15 分钟 load average
- [Async\\available_parallelism()](/zh/docs/reference/available-parallelism.html) —— 可用 CPU 数
