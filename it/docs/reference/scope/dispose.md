---
layout: docs
lang: it
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /it/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Cancella tutte le coroutine e chiude lo scope."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Cancella forzatamente tutte le coroutine nello scope e lo chiude. Dopo aver chiamato `dispose()`, lo scope viene contrassegnato sia come chiuso che come cancellato. Non e' possibile aggiungere nuove coroutine a uno scope chiuso.

Questo equivale a chiamare `cancel()` seguito dalla chiusura dello scope.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Chiusura forzata di uno scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancellata al dispose\n";
    }
});

// Tutte le coroutine saranno cancellate, scope chiuso
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Esempio #2 Pulizia in un blocco try/finally

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Logica di business
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## Vedi anche

- [Scope::disposeSafely](/it/docs/reference/scope/dispose-safely.html) — Chiusura sicura (con zombie)
- [Scope::disposeAfterTimeout](/it/docs/reference/scope/dispose-after-timeout.html) — Chiusura dopo un timeout
- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella senza chiudere lo scope
