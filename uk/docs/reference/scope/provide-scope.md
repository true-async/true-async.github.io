---
layout: docs
lang: uk
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /uk/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Реалізація інтерфейсу ScopeProvider — повертає поточну область видимості."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Реалізація інтерфейсу `ScopeProvider`. Повертає сам об'єкт області видимості. Це дозволяє використовувати `Scope` всюди, де очікується `ScopeProvider`.

## Значення, що повертається

`Scope` — поточний об'єкт області видимості.

## Приклади

### Приклад #1 Використання як ScopeProvider

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

// Scope itself implements ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Приклад #2 Поліморфізм із ScopeProvider

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

// Works with both Scope and ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## Дивіться також

- [Scope::inherit](/uk/docs/reference/scope/inherit.html) — Створення дочірньої області видимості
- [Scope::spawn](/uk/docs/reference/scope/spawn.html) — Запуск корутини в області видимості
