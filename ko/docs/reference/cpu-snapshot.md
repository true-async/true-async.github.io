---
layout: docs
lang: ko
path_key: "/docs/reference/cpu-snapshot.html"
nav_active: docs
permalink: /ko/docs/reference/cpu-snapshot.html
page_title: "Async\\CpuSnapshot"
description: "Async\\CpuSnapshot — 프로세스와 시스템 CPU 카운터의 불변 스냅샷. 자체 델타 계산을 위한 저수준 소스."
---

# Async\CpuSnapshot

(PHP 8.6+, True Async 1.0)

`Async\CpuSnapshot`은 프로세스와 시스템 CPU 카운터의 불변 point-in-time 스냅샷입니다.

## 언제 사용할까

고수준 wrapper [`Async\cpu_usage()`](/ko/docs/reference/cpu-usage.html)는 프로세스당 하나의 내부
스냅샷을 유지하며 델타를 자동으로 계산합니다. 대부분의 텔레메트리 작업에는 이걸로 충분합니다.

`CpuSnapshot`이 필요한 경우:

- 여러 독립적인 텔레메트리 소비자가 각자 델타를 계산하려고 할 때;
- "raw" 카운터를 그대로 저장해야 할 때 (로그, dump, 다른 시스템으로 전달);
- process/system뿐 아니라 자체 파생 메트릭을 계산하고 싶을 때.

## 클래스 개요

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

모든 time-valued 필드는 구현 정의된 시작점에서 단조 증가하는 나노초 카운터입니다.
**단일 값은 의미가 없습니다** — 서로 다른 시점에 찍은 두 스냅샷 사이의 델타를 계산하세요.

크로스 플랫폼: Linux와 Windows에서 동일한 필드와 시맨틱.

## 필드

| 필드 | 타입 | 설명 |
|------|-----|----------|
| `wallNs` | `int` | 캡처 시점의 단조 wall-clock 시간. |
| `processUserNs` | `int` | 프로세스 모든 스레드의 user-mode CPU 시간 합계. |
| `processSystemNs` | `int` | 프로세스 모든 스레드의 kernel-mode CPU 시간 합계. |
| `systemIdleNs` | `int` | 호스트의 모든 논리 CPU의 idle 시간 합계. |
| `systemBusyNs` | `int` | 호스트의 모든 논리 CPU의 non-idle 시간 합계 (`user + system + nice + irq + softirq + steal`). |
| `cpuCount` | `int` | 캡처 시점에 OS가 보는 논리 CPU 수. |

> **컨테이너 내부에서** `systemIdleNs` / `systemBusyNs`는 cgroup이 아닌 **호스트**를 반영합니다.
> per-process backpressure에는 `process*` 필드를 선호하세요 — affinity와 cgroup CPU throttling을
> 자동으로 고려합니다.

## 메서드

### now (static)

```php
public static CpuSnapshot::now(): CpuSnapshot
```

새 스냅샷을 찍습니다.

## 예제

### 예제 #1 수동 델타 계산

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

    // 간격 동안 user + kernel이 차지한 코어 수.
    $processCores = ($user + $sys) / $wall;

    printf(
        "프로세스가 지난 1초 동안 평균 %.3f 코어를 사용했습니다\n",
        $processCores
    );
});
```

### 예제 #2 두 개의 독립 소비자

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

// 인스턴스 두 개 — 측정 시리즈 두 개가 독립적.
$apiMetrics    = new TelemetryReporter();
$workerMetrics = new TelemetryReporter();
```

## 참고

> 이 클래스는 **불변**이며 **직렬화되지 않습니다** (`@strict-properties`, `@not-serializable`).
> 생성자는 private이며 — 인스턴스는 `CpuSnapshot::now()`로만 생성됩니다.

## 참고

- [Async\\cpu_usage()](/ko/docs/reference/cpu-usage.html) — 이미 계산된 백분율이 포함된 즉시 사용 가능한 델타
- [Async\\loadavg()](/ko/docs/reference/loadavg.html) — 1/5/15분 load average
- [Async\\available_parallelism()](/ko/docs/reference/available-parallelism.html) — 사용 가능한 CPU 수
