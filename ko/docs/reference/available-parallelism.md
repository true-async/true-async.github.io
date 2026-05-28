---
layout: docs
lang: ko
path_key: "/docs/reference/available-parallelism.html"
nav_active: docs
permalink: /ko/docs/reference/available-parallelism.html
page_title: "available_parallelism()"
description: "Async\\available_parallelism() — 프로세스가 사용 가능한 CPU 수를 반환합니다. cgroup 쿼터, affinity, 컨테이너 한도를 고려합니다."
---

# available_parallelism

(PHP 8.6+, True Async 1.0)

`Async\available_parallelism()`는 **현재 프로세스**가 사용 가능한 CPU 수를 반환합니다.

## 설명

```php
namespace Async;

function available_parallelism(): int
```

cgroup CPU 쿼터, `sched_setaffinity`, 유사한 제한을 고려합니다. libuv가 thread-pool / worker-pool
크기에 권장하는 값입니다. 항상 `>= 1`.

`cpu.max=2`인 컨테이너에서는 호스트의 물리 코어 수가 아니라 `2`를 반환합니다. bare-metal에서는
affinity 제한(설정된 경우)을 뺀 논리 코어 수.

백엔드: `uv_available_parallelism()`, fallback은 `uv_cpu_info`.

## 반환 값

`int` — CPU 수, 보장 `>= 1`.

## 예제

### 예제 #1 사용 가능한 CPU에 맞춰 풀 크기

```php
<?php
use Async\ThreadPool;
use function Async\available_parallelism;

// 관용적: ThreadPool은 workers=0이면 자동 감지가 내장됨.
// 다른 것을 스케일할 때 명시적 호출이 필요합니다.
$pool = new ThreadPool(workers: available_parallelism());
```

### 예제 #2 HTTP 서버 worker-pool 크기

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

### 예제 #3 환경 진단

```php
<?php
use function Async\available_parallelism;

echo "Process can use ", available_parallelism(), " CPU(s)\n";

// Docker `--cpus=2` → 2
// 제한 없는 16코어 호스트 → 16
// Kubernetes pod requests/limits cpu=1 → 1
```

## 참고

> **팁:** `ThreadPool`과 `HttpServer::setWorkers()`의 워커 풀에는 이 함수를 직접 호출할 필요가
> 거의 없습니다 — 두 컴포넌트 모두 풀 크기를 `0`으로 지정하면 `available_parallelism()`를
> 자동으로 사용합니다.

> 대부분의 IO-bound 부하에서는 `N + 1` 또는 `N + 2`로 오버커밋하는 것이 합리적입니다 — 일부
> 워커가 I/O에 막히기 때문입니다.

## 참고

- [Async\\ThreadPool](/ko/docs/components/thread-pool.html) — 값이 자동으로 사용되는 곳
- [Async\\cpu_usage()](/ko/docs/reference/cpu-usage.html) — 현재 프로세스/시스템 부하
- [Async\\loadavg()](/ko/docs/reference/loadavg.html) — 평균 run-queue 길이
