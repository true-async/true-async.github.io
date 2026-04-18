---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "스레드 풀 큐에서 대기 중인 작업 수를 가져옵니다."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

제출되었지만 아직 워커 스레드에 의해 가져가지지 않은 작업의 수를 반환합니다. 이 카운터는 원자적 변수로 지원되며, 워커가 병렬로 실행 중인 동안에도 언제든지 정확합니다.

## 반환값

`int` — 현재 큐에서 대기 중인 작업 수.

## 예제

### 예제 #1 큐가 비워지는 것 관찰하기

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // 워커가 시작될 시간을 줍니다

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "pending: ", $pool->getPendingCount(), "\n"; // pending: 0

    $pool->close();
});
```

## 참고

- [ThreadPool::getRunningCount()](/ko/docs/reference/thread-pool/get-running-count.html) — 현재 실행 중인 작업
- [ThreadPool::getCompletedCount()](/ko/docs/reference/thread-pool/get-completed-count.html) — 완료된 총 작업
- [ThreadPool::getWorkerCount()](/ko/docs/reference/thread-pool/get-worker-count.html) — 워커 수
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
