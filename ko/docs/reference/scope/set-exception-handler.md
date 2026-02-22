---
layout: docs
lang: ko
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /ko/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "자식 코루틴에 대한 예외 핸들러를 설정합니다."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

스코프의 자식 코루틴에서 발생한 예외에 대한 핸들러를 설정합니다. 코루틴이 처리되지 않은 예외와 함께 종료되면 오류가 상위로 전파되는 대신 지정된 핸들러가 호출됩니다.

## 매개변수

`exceptionHandler` — 예외 처리 함수. `\Throwable`을 인수로 받습니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 코루틴 오류 처리

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// 로그에 기록됨: "Coroutine error: Something went wrong"
```

### 예제 #2 중앙 집중식 오류 로깅

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## 참고

- [Scope::setChildScopeExceptionHandler](/ko/docs/reference/scope/set-child-scope-exception-handler.html) — 자식 스코프용 예외 핸들러
- [Scope::finally](/ko/docs/reference/scope/on-finally.html) — 스코프 완료 시 콜백
