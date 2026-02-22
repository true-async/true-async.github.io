---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "코루틴에서 발생한 예외를 가져옵니다."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

코루틴에서 발생한 예외를 반환합니다. 코루틴이 성공적으로 완료되었거나 아직 완료되지 않은 경우 `null`을 반환합니다. 코루틴이 취소된 경우 `AsyncCancellation` 객체를 반환합니다.

## 반환값

`mixed` -- 예외 또는 `null`.

- `null` -- 코루틴이 아직 완료되지 않았거나 성공적으로 완료된 경우
- `Throwable` -- 코루틴이 오류로 완료된 경우
- `AsyncCancellation` -- 코루틴이 취소된 경우

## 오류

코루틴이 현재 실행 중인 경우 `RuntimeException`을 던집니다.

## 예제

### 예제 #1 성공적인 완료

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### 예제 #2 오류로 완료

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // await 중에 포착됨
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### 예제 #3 취소된 코루틴

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## 같이 보기

- [Coroutine::getResult](/ko/docs/reference/coroutine/get-result.html) -- 결과 가져오기
- [Coroutine::isCancelled](/ko/docs/reference/coroutine/is-cancelled.html) -- 취소 확인
- [Exceptions](/ko/docs/components/exceptions.html) -- 오류 처리
