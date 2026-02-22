---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "코루틴이 취소되었는지 확인합니다."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

코루틴이 취소**되고** 완료되었는지 확인합니다. 취소가 완전히 끝난 경우에만 `true`를 반환합니다.

코루틴이 `protect()` 내부에 있는 경우, `cancel()`이 이미 호출되었더라도 보호 구간이 완료될 때까지 `isCancelled()`는 `false`를 반환합니다. 취소 요청을 확인하려면 `isCancellationRequested()`를 사용하세요.

## 반환값

`bool` -- 코루틴이 취소되고 완료된 경우 `true`.

## 예제

### 예제 #1 기본 취소

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // 취소가 완료되도록 양보

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### 예제 #2 protect()를 사용한 지연 취소

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // 임계 구간 -- 취소가 지연됨
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// 취소가 요청되었지만 아직 완료되지 않음
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // protect()가 완료되도록 양보

var_dump($coroutine->isCancelled());             // bool(true)
```

## 같이 보기

- [Coroutine::isCancellationRequested](/ko/docs/reference/coroutine/is-cancellation-requested.html) -- 취소 요청 확인
- [Coroutine::cancel](/ko/docs/reference/coroutine/cancel.html) -- 코루틴 취소
- [Cancellation](/ko/docs/components/cancellation.html) -- 취소 개념
