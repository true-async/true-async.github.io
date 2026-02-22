---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "코루틴 실행 결과를 가져옵니다."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

코루틴의 실행 결과를 반환합니다. 코루틴이 아직 완료되지 않은 경우 `null`을 반환합니다.

**중요:** 이 메서드는 코루틴의 완료를 기다리지 않습니다. 대기하려면 `await()`를 사용하세요.

## 반환값

`mixed` -- 코루틴 결과 또는 코루틴이 아직 완료되지 않은 경우 `null`.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// 완료 전
var_dump($coroutine->getResult()); // NULL

// 완료 대기
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### 예제 #2 isCompleted()로 확인

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // 코루틴이 완료되도록 양보

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## 같이 보기

- [Coroutine::getException](/ko/docs/reference/coroutine/get-exception.html) -- 예외 가져오기
- [Coroutine::isCompleted](/ko/docs/reference/coroutine/is-completed.html) -- 완료 확인
- [await()](/ko/docs/reference/await.html) -- 결과 대기
