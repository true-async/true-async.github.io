---
layout: docs
lang: ko
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /ko/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "새로운 루트 Scope를 생성합니다."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

새로운 루트 `Scope`를 생성합니다. 루트 스코프는 부모 스코프가 없으며 코루틴 수명 주기를 관리하기 위한 독립적인 단위로 사용됩니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### 예제 #2 여러 개의 독립적인 스코프 생성

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// 하나의 스코프를 취소해도 다른 스코프에 영향을 주지 않습니다
$scopeA->cancel();

// $scopeB는 계속 실행됩니다
$scopeB->awaitCompletion();
```

## 참고

- [Scope::inherit](/ko/docs/reference/scope/inherit.html) — 자식 Scope 생성
- [Scope::spawn](/ko/docs/reference/scope/spawn.html) — 스코프에서 코루틴 생성
