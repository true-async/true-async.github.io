---
layout: docs
lang: de
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /de/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Erstellt einen neuen Scope, der von einem angegebenen oder aktuellen Scope erbt."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Erstellt einen neuen `Scope`, der vom angegebenen Eltern-Scope erbt. Wenn der Parameter `$parentScope` nicht angegeben wird (oder `null` ist), erbt der neue Scope vom aktuell aktiven Scope.

Der Kind-Scope erbt Exception-Handler und Abbruchrichtlinien vom Eltern-Scope.

## Parameter

`parentScope` — der Eltern-Scope, von dem der neue Scope erben wird. Wenn `null`, wird der aktuell aktive Scope verwendet.

## Rueckgabewert

`Scope` — ein neuer Kind-Scope.

## Beispiele

### Beispiel #1 Kind-Scope vom aktuellen erstellen

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Innerhalb der Koroutine ist der aktuelle Scope $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Ausfuehrung im Kind-Scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Beispiel #2 Eltern-Scope explizit angeben

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Koroutine im Kind-Scope\n";
});

// Das Abbrechen des Eltern-Scopes bricht auch den Kind-Scope ab
$rootScope->cancel();
```

## Siehe auch

- [Scope::\_\_construct](/de/docs/reference/scope/construct.html) — Einen Root-Scope erstellen
- [Scope::getChildScopes](/de/docs/reference/scope/get-child-scopes.html) — Kind-Scopes abrufen
- [Scope::dispose](/de/docs/reference/scope/dispose.html) — Abbrechen und den Scope schliessen
