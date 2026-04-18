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
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

새 스레드 풀을 생성하고 모든 워커 스레드를 즉시 시작합니다. 워커는 풀의 수명 동안 살아 있으므로, 작업별 스레드 시작 오버헤드가 없습니다.

## 매개변수

| 매개변수     | 타입  | 설명                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | 생성할 워커 스레드 수. 반드시 ≥ 1이어야 합니다. 모든 스레드는 생성 시점에 시작됩니다.                |
| `$queueSize` | `int` | 큐에서 대기할 수 있는 최대 작업 수. `0` (기본값)은 `$workers × 4`를 의미합니다. 큐가 가득 차면 `submit()`은 슬롯이 생길 때까지 호출 코루틴을 일시 중단합니다. |

## 예외

`$workers < 1`이면 `\ValueError`를 던집니다.

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

## 참고

- [ThreadPool::submit()](/ko/docs/reference/thread-pool/submit.html) — 풀에 작업 추가
- [ThreadPool::close()](/ko/docs/reference/thread-pool/close.html) — 정상적인 종료
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
- [`spawn_thread()`](/ko/docs/reference/spawn-thread.html) — 단일 작업을 위한 일회성 스레드
