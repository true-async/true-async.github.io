---
layout: docs
lang: ko
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Future를 취소합니다."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

`Future`를 취소합니다. `await()`를 통해 이 Future를 대기하는 모든 코루틴은 `CancelledException`를 수신합니다. `$cancellation` 매개변수가 제공된 경우, 취소 사유로 사용됩니다.

## 매개변수

`cancellation` — 사용자 정의 취소 예외. `null`인 경우 기본 `CancelledException`가 사용됩니다.

## 반환값

이 함수는 값을 반환하지 않습니다.

## 예제

### 예제 #1 기본 Future 취소

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// 결과를 대기하는 코루틴
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// Future 취소
$future->cancel();
```

### 예제 #2 사용자 정의 사유를 사용한 취소

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## 같이 보기

- [Future::isCancelled](/ko/docs/reference/future/is-cancelled.html) — Future가 취소되었는지 확인
- [Future::await](/ko/docs/reference/future/await.html) — 결과 대기
- [Future::catch](/ko/docs/reference/future/catch.html) — Future 오류 처리
