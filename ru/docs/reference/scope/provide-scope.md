---
layout: docs
lang: ru
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /ru/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Реализация интерфейса ScopeProvider — возвращает текущий scope."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Реализация интерфейса `ScopeProvider`. Возвращает сам объект scope. Это позволяет использовать `Scope` в любом месте, где ожидается `ScopeProvider`.

## Возвращаемое значение

`Scope` — текущий объект scope.

## Примеры

### Пример #1 Использование как ScopeProvider

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "Работаю в предоставленном scope\n";
    });
}

$scope = new Scope();

// Scope сам реализует ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Пример #2 Полиморфизм с ScopeProvider

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
            echo "Worker $i запущен\n";
        });
    }
}

// Работает и с Scope, и с ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## См. также

- [Scope::inherit](/ru/docs/reference/scope/inherit.html) — Создать дочерний scope
- [Scope::spawn](/ru/docs/reference/scope/spawn.html) — Запустить корутину в scope
