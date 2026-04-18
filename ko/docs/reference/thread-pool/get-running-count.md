---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "워커 스레드에서 현재 실행 중인 작업 수를 가져옵니다."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

현재 워커 스레드에 의해 실행되고 있는 작업의 수(즉, 큐에서 가져갔지만 아직 완료되지 않은)를 반환합니다. 최댓값은 워커 수에 의해 제한됩니다. 이 카운터는 원자적 변수로 지원되며 언제든지 정확합니다.

## 반환값

`int` — 모든 워커 스레드에서 현재 실행 중인 작업 수.

## 예제

### 예제 #1 작업 실행 중 실행 카운트 관찰하기

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // 워커가 시작될 시간을 줍니다

    echo "workers: ", $pool->getWorkerCount(), "\n";  // workers: 3
    echo "running: ", $pool->getRunningCount(), "\n"; // running: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "running: ", $pool->getRunningCount(), "\n"; // running: 0

    $pool->close();
});
```

## 참고

- [ThreadPool::getPendingCount()](/ko/docs/reference/thread-pool/get-pending-count.html) — 큐에서 대기 중인 작업
- [ThreadPool::getCompletedCount()](/ko/docs/reference/thread-pool/get-completed-count.html) — 완료된 총 작업
- [ThreadPool::getWorkerCount()](/ko/docs/reference/thread-pool/get-worker-count.html) — 워커 수
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
