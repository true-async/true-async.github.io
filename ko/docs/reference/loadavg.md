---
layout: docs
lang: ko
path_key: "/docs/reference/loadavg.html"
nav_active: docs
permalink: /ko/docs/reference/loadavg.html
page_title: "loadavg()"
description: "Async\\loadavg() — 1/5/15분 load average. POSIX, Windows에서는 null 반환."
---

# loadavg

(PHP 8.6+, True Async 1.0)

`Async\loadavg()`는 지난 1, 5, 15분간의 시스템 load average를 반환하거나, 플랫폼이 load average를
지원하지 않으면 `null`을 반환합니다(Windows).

## 설명

```php
namespace Async;

function loadavg(): ?array
```

Load average는 커널 run-queue의 평균 길이입니다. CPU utilization과는 **다른 지표**입니다.
4코어 머신에서 지속적인 load 4.0은 run-queue가 평균적으로 가득 차 있다는 뜻입니다.

## 반환 값

`array{0: float, 1: float, 2: float}` — `[1min, 5min, 15min]`. Windows에서는 `null`.

## 예제

### 예제 #1 기본 사용

```php
<?php
use function Async\loadavg;

$load = loadavg();
if ($load !== null) {
    printf("Load average: %.2f %.2f %.2f\n", $load[0], $load[1], $load[2]);
} else {
    echo "이 플랫폼에서는 load average를 사용할 수 없습니다\n";
}
```

### 예제 #2 과부하 알림

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

        // 사용 가능한 CPU 수보다 큰 5분 load = 지속적 과부하.
        if ($load[1] > $cpu) {
            error_log(sprintf(
                "[WARN] sustained load %.2f (5min) > %d CPUs",
                $load[1], $cpu
            ));
        }
    }
});
```

## 참고

> **Load average ≠ CPU usage.** CPU 사용량이 낮은데 load가 높다면 보통 I/O-bound 워크로드를
> 의미합니다 (프로세스가 disk/network에서 `D` 상태로 대기). CPU 평가에는
> [`cpu_usage()`](/ko/docs/reference/cpu-usage.html)를 선호하세요.

> **Windows.** Windows에는 load average 개념이 없습니다 (BSD/Linux 고유). 함수는 의도적으로
> `null`을 반환하며 에뮬레이션하지 않습니다.

## 참고

- [Async\\cpu_usage()](/ko/docs/reference/cpu-usage.html) — 현재 프로세스/시스템 부하
- [Async\\available_parallelism()](/ko/docs/reference/available-parallelism.html) — 사용 가능한 CPU 수
- [Async\\CpuSnapshot](/ko/docs/reference/cpu-snapshot.html) — 저수준 CPU 카운터
