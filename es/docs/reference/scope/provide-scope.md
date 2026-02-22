---
layout: docs
lang: es
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /es/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Implementación de la interfaz ScopeProvider — devuelve el ámbito actual."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Implementación de la interfaz `ScopeProvider`. Devuelve el propio objeto de ámbito. Esto permite que `Scope` se utilice en cualquier lugar donde se espere un `ScopeProvider`.

## Valor de retorno

`Scope` — el objeto de ámbito actual.

## Ejemplos

### Ejemplo #1 Uso como ScopeProvider

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

### Ejemplo #2 Polimorfismo con ScopeProvider

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

## Ver también

- [Scope::inherit](/es/docs/reference/scope/inherit.html) — Crear un ámbito hijo
- [Scope::spawn](/es/docs/reference/scope/spawn.html) — Lanzar una corrutina en el ámbito
