---
layout: docs
lang: ko
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /ko/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "지정된 스코프 또는 현재 스코프를 상속하는 새로운 Scope를 생성합니다."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

지정된 부모 스코프를 상속하는 새로운 `Scope`를 생성합니다. `$parentScope` 매개변수가 제공되지 않거나 `null`인 경우, 새 스코프는 현재 활성 스코프를 상속합니다.

자식 스코프는 부모로부터 예외 핸들러와 취소 정책을 상속합니다.

## 매개변수

`parentScope` — 새 스코프가 상속할 부모 스코프. `null`이면 현재 활성 스코프가 사용됩니다.

## 반환값

`Scope` — 새로운 자식 스코프.

## 예제

### 예제 #1 현재 스코프에서 자식 스코프 생성

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // 코루틴 내부에서 현재 스코프는 $parentScope입니다
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### 예제 #2 부모 스코프를 명시적으로 지정

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// 부모를 취소하면 자식 스코프도 취소됩니다
$rootScope->cancel();
```

## 참고

- [Scope::\_\_construct](/ko/docs/reference/scope/construct.html) — 루트 Scope 생성
- [Scope::getChildScopes](/ko/docs/reference/scope/get-child-scopes.html) — 자식 스코프 가져오기
- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프 취소 및 닫기
