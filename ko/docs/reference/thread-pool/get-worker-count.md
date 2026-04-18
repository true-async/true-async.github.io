---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "스레드 풀의 워커 스레드 수를 가져옵니다."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

풀의 워커 스레드 수를 반환합니다. 이 값은 생성 시점에 고정되며 풀의 수명 동안 변경되지 않습니다. [`new ThreadPool()`](/ko/docs/reference/thread-pool/__construct.html)에 전달된 `$workers` 인수와 같습니다.

## 반환값

`int` — 워커 스레드 수 (생성자에서 설정된 값).

## 예제

### 예제 #1 워커 수 확인

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    echo $pool->getWorkerCount(), "\n"; // 4

    $pool->close();
});
```

### 예제 #2 사용 가능한 CPU 코어에 맞게 풀 크기 조정

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool created with ", $pool->getWorkerCount(), " workers\n";

    $futures = [];
    for ($i = 0; $i < $cores * 2; $i++) {
        $futures[] = $pool->submit(fn() => 'done');
    }
    foreach ($futures as $f) {
        await($f);
    }

    $pool->close();
});
```

## 참고

- [ThreadPool::getPendingCount()](/ko/docs/reference/thread-pool/get-pending-count.html) — 큐에서 대기 중인 작업
- [ThreadPool::getRunningCount()](/ko/docs/reference/thread-pool/get-running-count.html) — 현재 실행 중인 작업
- [ThreadPool::getCompletedCount()](/ko/docs/reference/thread-pool/get-completed-count.html) — 완료된 총 작업
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
