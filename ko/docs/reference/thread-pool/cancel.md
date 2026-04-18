---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "스레드 풀을 강제 중지하고 큐에 있는 모든 작업을 즉시 거부합니다."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

풀의 강제 종료를 시작합니다. `cancel()`이 호출된 후:

- 이후의 모든 `submit()` 호출은 즉시 `Async\ThreadPoolException`을 던집니다.
- 큐에서 대기 중인 작업(아직 워커가 가져가지 않은)은 **즉시 거부**됩니다 — 해당하는 `Future` 객체는 `ThreadPoolException`과 함께 거부 상태로 전환됩니다.
- 이미 워커 스레드에서 실행 중인 작업은 현재 작업의 완료까지 실행됩니다(스레드 내부의 PHP 코드를 강제로 중단하는 것은 불가능합니다).
- 워커는 현재 작업을 마치는 즉시 중지하며 큐에서 새 작업을 가져오지 않습니다.

큐에 있는 모든 작업이 완료될 때까지 기다리는 정상적인 종료를 원한다면 [`close()`](/ko/docs/reference/thread-pool/close.html)를 사용하세요.

## 반환값

`void`

## 예제

### 예제 #1 큐에 작업이 있을 때 강제 취소

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // 워커 2개에 걸쳐 8개의 작업으로 큐를 채웁니다
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // 즉시 취소 — 큐에 있는 작업들은 거부됩니다
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (cancel() 호출 시 이미 실행 중이었던 것)
    echo "cancelled: $cancelled\n"; // 6  (아직 큐에 있었던 것)
});
```

## 참고

- [ThreadPool::close()](/ko/docs/reference/thread-pool/close.html) — 정상적인 종료
- [ThreadPool::isClosed()](/ko/docs/reference/thread-pool/is-closed.html) — 풀이 닫혔는지 확인
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요 및 close()와 cancel() 비교
