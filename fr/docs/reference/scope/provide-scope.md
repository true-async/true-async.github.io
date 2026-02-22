---
layout: docs
lang: fr
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /fr/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Implémentation de l'interface ScopeProvider — retourne le scope courant."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Implémentation de l'interface `ScopeProvider`. Retourne l'objet scope lui-même. Cela permet d'utiliser `Scope` partout où un `ScopeProvider` est attendu.

## Valeur de retour

`Scope` — l'objet scope courant.

## Exemples

### Exemple #1 Utilisation en tant que ScopeProvider

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

// Scope implémente lui-même ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Exemple #2 Polymorphisme avec ScopeProvider

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

// Fonctionne avec Scope et ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## Voir aussi

- [Scope::inherit](/fr/docs/reference/scope/inherit.html) — Créer un scope enfant
- [Scope::spawn](/fr/docs/reference/scope/spawn.html) — Lancer une coroutine dans le scope
