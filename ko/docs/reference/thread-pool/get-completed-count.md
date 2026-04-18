---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "스레드 풀이 생성된 이후 완료된 총 작업 수를 가져옵니다."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

풀이 생성된 이후 이 풀의 어떤 워커에 의해서든 완료된(성공적으로 또는 예외와 함께) 총 작업 수를 반환합니다. 이 카운터는 단조 증가하며 절대 재설정되지 않습니다. 원자적 변수로 지원되며 언제든지 정확합니다.

작업은 워커가 실행을 완료했을 때 완료된 것으로 카운트됩니다 — 값을 반환했는지 예외를 던졌는지와 무관합니다.

## 반환값

`int` — 풀 생성 이후 완료된 총 작업 수.

## 예제

### 예제 #1 처리량 추적

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

    delay(10);
    echo "completed so far: ", $pool->getCompletedCount(), "\n"; // 0 이상

    foreach ($futures as $f) {
        await($f);
    }

    echo "completed total: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## 참고

- [ThreadPool::getPendingCount()](/ko/docs/reference/thread-pool/get-pending-count.html) — 큐에서 대기 중인 작업
- [ThreadPool::getRunningCount()](/ko/docs/reference/thread-pool/get-running-count.html) — 현재 실행 중인 작업
- [ThreadPool::getWorkerCount()](/ko/docs/reference/thread-pool/get-worker-count.html) — 워커 수
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
