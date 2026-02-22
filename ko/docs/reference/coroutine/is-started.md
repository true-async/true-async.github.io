---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "스케줄러에 의해 코루틴이 시작되었는지 확인합니다."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

스케줄러에 의해 코루틴이 시작되었는지 확인합니다. 코루틴은 스케줄러가 실행을 시작한 후에 시작된 것으로 간주됩니다.

## 반환값

`bool` -- 코루틴이 시작된 경우 `true`.

## 예제

### 예제 #1 시작 전후 확인

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- 아직 대기열에 있음

suspend(); // 스케줄러가 코루틴을 시작하도록 양보

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- 완료 후에도 여전히 true
```

## 같이 보기

- [Coroutine::isQueued](/ko/docs/reference/coroutine/is-queued.html) -- 대기열 상태 확인
- [Coroutine::isRunning](/ko/docs/reference/coroutine/is-running.html) -- 현재 실행 중인지 확인
- [Coroutine::isCompleted](/ko/docs/reference/coroutine/is-completed.html) -- 완료 확인
