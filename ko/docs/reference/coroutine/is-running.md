---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "코루틴이 현재 실행 중인지 확인합니다."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

코루틴이 현재 실행 중인지 확인합니다. 코루틴은 시작되었고 아직 완료되지 않은 경우 실행 중으로 간주됩니다.

## 반환값

`bool` -- 코루틴이 실행 중이고 완료되지 않은 경우 `true`.

## 예제

### 예제 #1 실행 상태 확인

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // 코루틴 내부에서 isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// 외부 -- 코루틴이 일시 중단되었거나 아직 시작되지 않음
var_dump($coroutine->isRunning()); // bool(false)
```

## 같이 보기

- [Coroutine::isStarted](/ko/docs/reference/coroutine/is-started.html) -- 시작 여부 확인
- [Coroutine::isSuspended](/ko/docs/reference/coroutine/is-suspended.html) -- 일시 중단 확인
- [Coroutine::isCompleted](/ko/docs/reference/coroutine/is-completed.html) -- 완료 확인
