---
layout: docs
lang: ko
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "스레드 풀이 종료되었는지 확인합니다."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

풀이 [`close()`](/ko/docs/reference/thread-pool/close.html) 또는 [`cancel()`](/ko/docs/reference/thread-pool/cancel.html)을 통해 종료되었으면 `true`를 반환합니다. 풀이 아직 작업을 받고 있으면 `false`를 반환합니다.

## 반환값

`bool` — 풀이 닫혔으면 `true`; 아직 활성 상태이면 `false`.

## 예제

### 예제 #1 제출 전 상태 확인

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### 예제 #2 공유 컨텍스트에서 submit 보호하기

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## 참고

- [ThreadPool::close()](/ko/docs/reference/thread-pool/close.html) — 정상적인 종료
- [ThreadPool::cancel()](/ko/docs/reference/thread-pool/cancel.html) — 강제 종료
- [Async\ThreadPool](/ko/docs/components/thread-pool.html) — 컴포넌트 개요
