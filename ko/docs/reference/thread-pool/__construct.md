---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "고정된 수의 워커 스레드로 새 ThreadPool을 생성합니다."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

새 스레드 풀을 생성하고 모든 워커 스레드를 즉시 시작합니다. 워커는 풀의 수명 동안 살아 있으므로,
작업별 스레드 시작 오버헤드가 없습니다.

## 매개변수

| 매개변수       | 타입        | 설명                                                                                              |
|----------------|-------------|---------------------------------------------------------------------------------------------------|
| `$workers`     | `int`       | 워커 스레드 수. `0`(기본)은 [`Async\available_parallelism()`](/ko/docs/reference/available-parallelism.html)을 통한 자동 감지. |
| `$queueSize`   | `int`       | 대기 작업 큐의 최대 길이. `0`(기본)은 `workers × 4`. 큐가 가득 차면 `submit()`이 슬롯이 생길 때까지 호출 코루틴을 일시 중단. |
| `$bootloader`  | `?\Closure` | 워커 시작 초기화. 클로저는 한 번 deep copy되어 각 워커에서 작업 처리 메인 루프 **이전에** 실행됩니다. autoload, 커넥션 풀 워밍, opcache 사전 컴파일에 편리. bootloader가 예외를 던지면 전체 풀이 실패로 간주됩니다. |
| `$coroutine`   | `bool`      | `true`이면 — 각 작업이 자체 자식 scope(워커 풀의 공통 scope에 중첩됨)에서 **코루틴으로** 실행됩니다. 작업 안에서 `await`, channel, IO, `spawn`을 사용할 수 있습니다 — OS 스레드를 블로킹하지 않고. |
| `$concurrency` | `int`       | 워커당 동시에 살아 있는 코루틴 한도. `coroutine: true`일 때만 사용됨. `0`(기본)은 제한 없음. |

## 예외

`$workers < 0` 또는 `$queueSize < 0`이면 `\ValueError`를 던집니다.

## 예제

### 예제 #1 기본 풀 생성

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 워커 4개, 큐 크기는 기본값 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### 예제 #2 명시적 큐 크기

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 워커 4개, 큐는 최대 64개 대기 작업으로 제한
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... 작업 제출 ...

    $pool->close();
});
```

### 예제 #3 Bootloader — 워커 시작 초기화

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... submit한 작업은 완전히 초기화된 환경을 봅니다 ...

    $pool->close();
});
```

### 예제 #4 코루틴 모드 — 작업 내에서 await 사용 가능

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // 일반적인 블로킹 호출이 워커의 OS 스레드를 블로킹하지 않고
        // 코루틴을 올바르게 park합니다
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### 예제 #5 사용 가능한 CPU에 따른 워커 수 자동 감지

```php
<?php

use Async\ThreadPool;

// workers: 0 (기본) → Async\available_parallelism()
$pool = new ThreadPool();   // 컨테이너의 cgroup 쿼터 / affinity 고려
```

## 참고

- [ThreadPool::submit()](/ko/docs/reference/thread-pool/submit.html) — 풀에 작업 추가
- [ThreadPool::close()](/ko/docs/reference/thread-pool/close.html) — 정상적인 종료
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
- [`spawn_thread()`](/ko/docs/reference/spawn-thread.html) — 단일 작업을 위한 일회성 스레드
