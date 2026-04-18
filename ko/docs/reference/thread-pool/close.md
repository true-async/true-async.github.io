---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "스레드 풀을 정상적으로 종료하고, 큐에 있는 모든 작업과 실행 중인 작업이 완료될 때까지 기다립니다."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

풀의 정상적인 종료를 시작합니다. `close()`가 호출된 후:

- 이후의 모든 `submit()` 호출은 즉시 `Async\ThreadPoolException`을 던집니다.
- 이미 큐에 있는 작업들은 계속 진행되어 정상적으로 완료됩니다.
- 현재 워커 스레드에서 실행 중인 작업들은 정상적으로 완료됩니다.
- 이 메서드는 진행 중인 모든 작업이 완료되고 모든 워커가 중지될 때까지 호출 코루틴을 차단합니다.

큐에 있는 작업을 버리는 즉각적이고 강제적인 종료를 원한다면 [`cancel()`](/ko/docs/reference/thread-pool/cancel.html)을 사용하세요.

## 반환값

`void`

## 예제

### 예제 #1 모든 작업 제출 후 정상적인 종료

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // 위 작업이 완료될 때까지 기다립니다

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### 예제 #2 close 후 submit은 예외를 던집니다

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Error: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## 참고

- [ThreadPool::cancel()](/ko/docs/reference/thread-pool/cancel.html) — 강제/즉시 종료
- [ThreadPool::isClosed()](/ko/docs/reference/thread-pool/is-closed.html) — 풀이 닫혔는지 확인
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
