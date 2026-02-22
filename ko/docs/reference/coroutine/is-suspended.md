---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "코루틴이 일시 중단되었는지 확인합니다."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

코루틴이 일시 중단되었는지 확인합니다. 코루틴은 `suspend()`가 호출되거나, I/O 작업 중이거나, `await()`로 대기 중일 때 일시 중단됩니다.

## 반환값

`bool` -- 코루틴이 일시 중단된 경우 `true`.

## 예제

### 예제 #1 일시 중단 확인

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // 코루틴이 시작되고 일시 중단되도록 양보

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## 같이 보기

- [Coroutine::isRunning](/ko/docs/reference/coroutine/is-running.html) -- 실행 확인
- [Coroutine::getTrace](/ko/docs/reference/coroutine/get-trace.html) -- 일시 중단된 코루틴의 호출 스택
- [suspend()](/ko/docs/reference/suspend.html) -- 현재 코루틴 일시 중단
