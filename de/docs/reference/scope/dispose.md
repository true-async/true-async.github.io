---
layout: docs
lang: de
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /de/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Bricht alle Koroutinen ab und schliesst den Scope."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Bricht erzwungen alle Koroutinen im Scope ab und schliesst ihn. Nach dem Aufruf von `dispose()` wird der Scope als geschlossen und abgebrochen markiert. Einem geschlossenen Scope koennen keine neuen Koroutinen hinzugefuegt werden.

Dies entspricht dem Aufruf von `cancel()` gefolgt vom Schliessen des Scopes.

## Rueckgabewert

Es wird kein Wert zurueckgegeben.

## Beispiele

### Beispiel #1 Erzwungenes Schliessen eines Scopes

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Koroutine beim Dispose abgebrochen\n";
    }
});

// Alle Koroutinen werden abgebrochen, Scope geschlossen
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Beispiel #2 Bereinigung in einem try/finally-Block

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Geschaeftslogik
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## Siehe auch

- [Scope::disposeSafely](/de/docs/reference/scope/dispose-safely.html) — Sicheres Schliessen (mit Zombies)
- [Scope::disposeAfterTimeout](/de/docs/reference/scope/dispose-after-timeout.html) — Schliessen nach einem Timeout
- [Scope::cancel](/de/docs/reference/scope/cancel.html) — Abbrechen ohne den Scope zu schliessen
