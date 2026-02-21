---
layout: docs
lang: it
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /it/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Chiude lo scope dopo un timeout specificato."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Pianifica la chiusura dello scope dopo un timeout specificato. Quando il timeout scade, viene chiamato `dispose()`, cancellando tutte le coroutine e chiudendo lo scope. Questo e' comodo per impostare una durata massima dello scope.

## Parametri

`timeout` — tempo in millisecondi prima della chiusura automatica dello scope.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Limitazione del tempo di esecuzione

```php
<?php

use Async\Scope;

$scope = new Scope();

// Lo scope verra' chiuso dopo 10 secondi
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Operazione lunga
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancellato dal timeout dello scope\n";
    }
});

$scope->awaitCompletion();
```

### Esempio #2 Scope con durata limitata

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 secondi per tutto il lavoro

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Non terminera' in tempo
    echo "Task 3: OK\n"; // Non verra' stampato
});

$scope->awaitCompletion();
```

## Vedi anche

- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Chiusura immediata dello scope
- [Scope::disposeSafely](/it/docs/reference/scope/dispose-safely.html) — Chiusura sicura dello scope
- [timeout()](/it/docs/reference/timeout.html) — Funzione globale di timeout
