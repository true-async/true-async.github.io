---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "스레드 풀에 작업을 제출하고 결과에 대한 Future를 받습니다."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

풀의 내부 큐에 작업을 추가합니다. 유휴 워커가 작업을 가져가 실행하고, 반환된 `Future`를 반환값으로 해결합니다. 큐가 가득 찬 경우, 슬롯이 열릴 때까지 호출 코루틴이 일시 중단됩니다.

## 매개변수

| 매개변수 | 타입       | 설명                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | 워커 스레드에서 실행할 callable. 워커로 깊은 복사됩니다 — 객체나 리소스를 캡처하는 클로저는 `Async\ThreadTransferException`을 던집니다. |
| `...$args`| `mixed`    | `$task`에 전달할 추가 인수. 역시 깊은 복사됩니다.                                                           |

## 반환값

`Async\Future` — `$task`의 반환값으로 해결되거나, `$task`가 던진 예외로 거부됩니다.

## 예외

- `Async\ThreadPoolException` — `close()` 또는 `cancel()`을 통해 풀이 닫힌 경우 즉시 던져집니다.
- `Async\ThreadTransferException` — `$task` 또는 어떤 인수가 전송을 위해 직렬화될 수 없는 경우(예: `stdClass`, PHP 참조, 리소스).

## 예제

### 예제 #1 기본 submit과 await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### 예제 #2 작업에서 던진 예외 처리

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Caught: ", $e->getMessage(), "\n";
        // Caught: something went wrong in the worker
    }

    $pool->close();
});
```

### 예제 #3 여러 작업 병렬 제출

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## 참고

- [ThreadPool::map()](/ko/docs/reference/thread-pool/map.html) — 배열에 대한 병렬 map
- [ThreadPool::close()](/ko/docs/reference/thread-pool/close.html) — 정상적인 종료
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요 및 데이터 전송 규칙
