---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "코루틴에 대해 취소가 요청되었는지 확인합니다."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

코루틴에 대해 취소가 요청되었는지 확인합니다. `isCancelled()`와 달리, 코루틴이 아직 `protect()` 내에서 실행 중이더라도 `cancel()`이 호출된 직후 `true`를 반환합니다.

## 반환값

`bool` -- 취소가 요청된 경우 `true`.

## 예제

### 예제 #1 isCancelled()와의 차이점

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// 취소 전
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// cancel() 호출 직후
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- 아직 protect() 내부
```

## 같이 보기

- [Coroutine::isCancelled](/ko/docs/reference/coroutine/is-cancelled.html) -- 완료된 취소 확인
- [Coroutine::cancel](/ko/docs/reference/coroutine/cancel.html) -- 코루틴 취소
- [protect()](/ko/docs/reference/protect.html) -- 보호 구간
