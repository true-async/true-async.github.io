---
layout: docs
lang: it
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /it/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Implementazione dell'interfaccia ScopeProvider — restituisce lo scope corrente."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Implementazione dell'interfaccia `ScopeProvider`. Restituisce l'oggetto scope stesso. Questo consente di utilizzare `Scope` ovunque sia richiesto un `ScopeProvider`.

## Valore di ritorno

`Scope` — l'oggetto scope corrente.

## Esempi

### Esempio #1 Utilizzo come ScopeProvider

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "In esecuzione nello scope fornito\n";
    });
}

$scope = new Scope();

// Scope stesso implementa ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Esempio #2 Polimorfismo con ScopeProvider

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
            echo "Worker $i avviato\n";
        });
    }
}

// Funziona sia con Scope che con ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## Vedi anche

- [Scope::inherit](/it/docs/reference/scope/inherit.html) — Crea uno scope figlio
- [Scope::spawn](/it/docs/reference/scope/spawn.html) — Avvia una coroutine nello scope
