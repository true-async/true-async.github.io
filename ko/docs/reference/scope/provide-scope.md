---
layout: docs
lang: ko
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /ko/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "ScopeProvider 인터페이스 구현 — 현재 스코프를 반환합니다."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

`ScopeProvider` 인터페이스의 구현입니다. 스코프 객체 자체를 반환합니다. 이를 통해 `ScopeProvider`가 기대되는 모든 곳에서 `Scope`를 사용할 수 있습니다.

## 반환값

`Scope` — 현재 스코프 객체.

## 예제

### 예제 #1 ScopeProvider로 사용

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "Running in the provided scope\n";
    });
}

$scope = new Scope();

// Scope 자체가 ScopeProvider를 구현합니다
runInScope($scope);

$scope->awaitCompletion();
```

### 예제 #2 ScopeProvider를 사용한 다형성

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

class ServiceContainer implements ScopeProvider {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope {
        return $this->scope;
    }
}

function startWorkers(ScopeProvider $provider, int $count): void {
    $scope = $provider->provideScope();

    for ($i = 0; $i < $count; $i++) {
        $scope->spawn(function() use ($i) {
            echo "Worker $i started\n";
        });
    }
}

// Scope와 ServiceContainer 모두에서 작동합니다
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## 참고

- [Scope::inherit](/ko/docs/reference/scope/inherit.html) — 자식 스코프 생성
- [Scope::spawn](/ko/docs/reference/scope/spawn.html) — 스코프에서 코루틴 생성
