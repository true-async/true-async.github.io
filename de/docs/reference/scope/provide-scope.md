---
layout: docs
lang: de
path_key: "/docs/reference/scope/provide-scope.html"
nav_active: docs
permalink: /de/docs/reference/scope/provide-scope.html
page_title: "Scope::provideScope"
description: "Implementierung des ScopeProvider-Interfaces — gibt den aktuellen Scope zurueck."
---

# Scope::provideScope

(PHP 8.6+, True Async 1.0)

```php
public function provideScope(): Scope
```

Implementierung des `ScopeProvider`-Interfaces. Gibt das Scope-Objekt selbst zurueck. Dies ermoeglicht die Verwendung von `Scope` ueberall dort, wo ein `ScopeProvider` erwartet wird.

## Rueckgabewert

`Scope` — das aktuelle Scope-Objekt.

## Beispiele

### Beispiel #1 Verwendung als ScopeProvider

```php
<?php

use Async\Scope;
use Async\ScopeProvider;

function runInScope(ScopeProvider $provider): void {
    $scope = $provider->provideScope();

    $scope->spawn(function() {
        echo "Ausfuehrung im bereitgestellten Scope\n";
    });
}

$scope = new Scope();

// Scope selbst implementiert ScopeProvider
runInScope($scope);

$scope->awaitCompletion();
```

### Beispiel #2 Polymorphismus mit ScopeProvider

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
            echo "Worker $i gestartet\n";
        });
    }
}

// Funktioniert sowohl mit Scope als auch mit ServiceContainer
$scope = new Scope();
startWorkers($scope, 3);

$container = new ServiceContainer();
startWorkers($container, 3);
```

## Siehe auch

- [Scope::inherit](/de/docs/reference/scope/inherit.html) — Einen Kind-Scope erstellen
- [Scope::spawn](/de/docs/reference/scope/spawn.html) — Eine Koroutine im Scope starten
