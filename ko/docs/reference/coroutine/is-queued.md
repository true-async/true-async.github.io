---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "코루틴이 스케줄러 대기열에 있는지 확인합니다."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

코루틴이 실행을 위해 스케줄러 대기열에 있는지 확인합니다.

## 반환값

`bool` -- 코루틴이 대기열에 있는 경우 `true`.

## 예제

### 예제 #1 대기열 상태

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- 시작 대기 중

suspend(); // 스케줄러가 코루틴을 시작하도록 양보

// 코루틴이 시작되었지만 내부 suspend() 이후 대기열에 남아 있음
var_dump($coroutine->isStarted()); // bool(true)
```

## 같이 보기

- [Coroutine::isStarted](/ko/docs/reference/coroutine/is-started.html) -- 시작 여부 확인
- [Coroutine::isSuspended](/ko/docs/reference/coroutine/is-suspended.html) -- 일시 중단 확인
