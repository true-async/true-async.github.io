---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "일시 중단된 코루틴의 호출 스택을 가져옵니다."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

일시 중단된 코루틴의 호출 스택(백트레이스)을 반환합니다. 코루틴이 일시 중단 상태가 아닌 경우(아직 시작되지 않음, 현재 실행 중, 또는 완료됨) `null`을 반환합니다.

## 매개변수

**options**
: `debug_backtrace()`와 유사한 옵션의 비트마스크:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- 트레이스에 `$this` 포함
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- 함수 인수 미포함

**limit**
: 최대 스택 프레임 수. `0` -- 제한 없음.

## 반환값

`?array` -- 스택 프레임의 배열 또는 코루틴이 일시 중단 상태가 아닌 경우 `null`.

## 예제

### 예제 #1 일시 중단된 코루틴의 스택 가져오기

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // 코루틴이 시작되고 일시 중단되도록 양보

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### 예제 #2 완료된 코루틴의 트레이스 -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// 시작 전 -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// 완료 후 -- null
var_dump($coroutine->getTrace()); // NULL
```

## 같이 보기

- [Coroutine::isSuspended](/ko/docs/reference/coroutine/is-suspended.html) -- 일시 중단 확인
- [Coroutine::getSuspendLocation](/ko/docs/reference/coroutine/get-suspend-location.html) -- 일시 중단 위치
- [Coroutine::getSpawnLocation](/ko/docs/reference/coroutine/get-spawn-location.html) -- 생성 위치
