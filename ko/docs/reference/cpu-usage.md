---
layout: docs
lang: ko
path_key: "/docs/reference/cpu-usage.html"
nav_active: docs
permalink: /ko/docs/reference/cpu-usage.html
page_title: "cpu_usage()"
description: "Async\\cpu_usage() — 호출 간 델타를 자동 계산하는 현재 프로세스 및 시스템 CPU 부하. 텔레메트리에 편리합니다."
---

# cpu_usage

(PHP 8.6+, True Async 1.0)

`Async\cpu_usage()`는 이전 호출 이후의 CPU 부하를 이미 계산된 백분율과 함께 반환합니다.
텔레메트리 루프에 편리합니다.

## 설명

```php
namespace Async;

function cpu_usage(): array
```

이 함수는 CPU 카운터의 **per-process** 내부 "이전" 스냅샷을 유지합니다. 첫 호출은 스냅샷을
저장하고 0을 반환합니다. 이후 호출은 이전 스냅샷과의 델타를 반환하고 스냅샷을 교체합니다.

## 반환 값

연관 배열:

| 키 | 타입 | 설명 |
|------|-----|----------|
| `process_cores` | `float` | 프로세스가 사용 중인 평균 코어 수 (`0..cpuCount`). Multi-core factor. |
| `process_percent` | `float` | 머신 전체 capacity 대비 비율, `0..100`. |
| `system_percent` | `float` | 호스트의 전체 CPU 사용률, `0..100`. |
| `cpu_count` | `int` | OS가 보는 논리 CPU 수. |
| `interval_sec` | `float` | 스냅샷 사이의 wall-clock 초. |
| `loadavg` | `array{0:float,1:float,2:float}\|null` | 1/5/15분 load average. Windows에서는 `null`. |

> 컨테이너 내부에서 `system_percent`는 cgroup이 아닌 **호스트**를 반영합니다. per-process
> backpressure에는 `process_cores` / `process_percent`를 선호하세요 — affinity와 cgroup CPU
> throttling을 올바르게 고려합니다.

## 예제

### 예제 #1 초당 부하 로깅

```php
<?php
use function Async\spawn;
use function Async\delay;
use function Async\cpu_usage;

spawn(function () {
    // 첫 호출은 내부 스냅샷을 "워밍업"하고 0을 반환합니다.
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

### 예제 #2 프로세스 부하 기반 backpressure

```php
<?php
use function Async\cpu_usage;

function should_accept_more_work(): bool
{
    $u = cpu_usage();
    // 프로세스가 자기 몫의 capacity의 90%를 넘기면 새 작업을 받지 않음.
    return $u['process_percent'] < 90.0;
}
```

### 예제 #3 Health 엔드포인트

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

## 참고

> **상태는 프로세스 전역입니다.** 독립적인 텔레메트리 소비자가 여러 개 필요하면 (예: 서로 다른
> 서브시스템이 자체 델타 계산), [`CpuSnapshot::now()`](/ko/docs/reference/cpu-snapshot.html)로
> 스냅샷을 직접 가져와 델타를 직접 계산하세요.

## 참고

- [Async\\CpuSnapshot](/ko/docs/reference/cpu-snapshot.html) — 저수준 CPU 카운터 스냅샷
- [Async\\loadavg()](/ko/docs/reference/loadavg.html) — 1/5/15분 load average
- [Async\\available_parallelism()](/ko/docs/reference/available-parallelism.html) — 사용 가능한 CPU 수
