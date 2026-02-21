---
layout: docs
lang: it
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /it/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Attende il completamento di tutte le coroutine, incluse le zombie, dopo la cancellazione dello scope."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Attende il completamento di **tutte** le coroutine nello scope, comprese le coroutine zombie. Richiede una chiamata precedente a `cancel()`. Questo metodo viene utilizzato per la terminazione graduale dello scope quando e' necessario attendere che tutte le coroutine (incluse le zombie) completino il loro lavoro.

## Parametri

`errorHandler` — una funzione callback per la gestione degli errori delle coroutine zombie. Accetta un `\Throwable` come argomento. Se `null`, gli errori vengono ignorati.

`cancellation` — un oggetto `Awaitable` per interrompere l'attesa. Se `null`, l'attesa non ha limite di tempo.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Terminazione graduale con gestione degli errori

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completato\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Errore del task in background");
});

// Prima, cancella
$scope->cancel();

// Poi attendi il completamento di tutte le coroutine
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Errore zombie: " . $e->getMessage());
    }
);
```

### Esempio #2 Attesa con timeout

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Coroutine zombie che impiega molto tempo a terminare
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Pulizia delle risorse
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## Vedi anche

- [Scope::cancel](/it/docs/reference/scope/cancel.html) — Cancella tutte le coroutine
- [Scope::awaitCompletion](/it/docs/reference/scope/await-completion.html) — Attende le coroutine attive
- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Cancella e chiudi lo scope
