---
layout: docs
lang: it
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /it/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Chiude lo scope in modo sicuro — le coroutine diventano zombie."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Chiude lo scope in modo sicuro. Le coroutine attive **non vengono cancellate** ma diventano coroutine zombie: continuano a funzionare, ma lo scope e' considerato chiuso. Le coroutine zombie termineranno autonomamente quando completeranno il loro lavoro.

Se lo scope e' contrassegnato come "non sicuro" tramite `asNotSafely()`, le coroutine verranno cancellate invece di diventare zombie.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completato come zombie\n";
});

// Lo scope e' chiuso, ma la coroutine continua a funzionare
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// La coroutine continua l'esecuzione in background
```

### Esempio #2 Arresto graduale con attesa degli zombie

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task in background completato\n";
});

$scope->disposeSafely();

// Attende il completamento delle coroutine zombie
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Errore zombie: " . $e->getMessage());
    }
);
```

## Vedi anche

- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Chiusura forzata dello scope
- [Scope::asNotSafely](/it/docs/reference/scope/as-not-safely.html) — Disabilita il comportamento zombie
- [Scope::awaitAfterCancellation](/it/docs/reference/scope/await-after-cancellation.html) — Attende le coroutine zombie
