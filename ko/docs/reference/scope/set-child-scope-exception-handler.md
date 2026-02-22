---
layout: docs
lang: ko
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /ko/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "자식 Scope에 대한 예외 핸들러를 설정합니다."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

자식 스코프에서 발생한 예외에 대한 핸들러를 설정합니다. 자식 스코프가 오류와 함께 종료되면 이 핸들러가 호출되어 예외가 부모 스코프로 전파되는 것을 방지합니다.

## 매개변수

`exceptionHandler` — 자식 스코프의 예외 처리 함수. `\Throwable`을 인수로 받습니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 자식 스코프 오류 잡기

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// 오류가 처리되어 $parentScope로 전파되지 않습니다
```

### 예제 #2 모듈 간 오류 격리

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// 각 모듈은 자체 스코프에서 실행됩니다
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // 여기서 발생하는 오류는 $cacheScope에 영향을 주지 않습니다
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## 참고

- [Scope::setExceptionHandler](/ko/docs/reference/scope/set-exception-handler.html) — 코루틴용 예외 핸들러
- [Scope::inherit](/ko/docs/reference/scope/inherit.html) — 자식 스코프 생성
- [Scope::getChildScopes](/ko/docs/reference/scope/get-child-scopes.html) — 자식 스코프 가져오기
