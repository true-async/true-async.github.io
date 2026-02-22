---
layout: docs
lang: ko
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /ko/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "지정된 스코프에서 코루틴을 생성합니다."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

지정된 스코프 내에서 새로운 코루틴을 생성합니다. 코루틴은 스코프에 바인딩되어 수명 주기에 따라 관리됩니다: 스코프가 취소되거나 닫히면 모든 코루틴도 영향을 받습니다.

## 매개변수

`callable` — 코루틴으로 실행될 클로저.

`params` — 클로저에 전달할 인수.

## 반환값

`Coroutine` — 생성된 코루틴 객체.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Hello from a coroutine!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### 예제 #2 매개변수 전달

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Fetching $url with timeout {$timeout}ms\n";
    // ... 요청 수행
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## 참고

- [spawn()](/ko/docs/reference/spawn.html) — 코루틴 생성을 위한 전역 함수
- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 스코프의 모든 코루틴 취소
- [Scope::awaitCompletion](/ko/docs/reference/scope/await-completion.html) — 코루틴 완료 대기
