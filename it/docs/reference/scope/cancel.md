---
layout: docs
lang: it
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /it/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Cancella tutte le coroutine nello scope."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Cancella tutte le coroutine appartenenti allo scope specificato. Ogni coroutine attiva ricevera' una `CancelledException`. Se `$cancellationError` e' specificato, verra' utilizzato come motivo della cancellazione.

## Parametri

`cancellationError` — un'eccezione di cancellazione personalizzata. Se `null`, viene utilizzata la `CancelledException` standard.

## Valore di ritorno

Non viene restituito alcun valore.

## Esempi

### Esempio #1 Cancellazione base

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Operazione lunga
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancellata\n";
    }
});

// Cancella tutte le coroutine
$scope->cancel();
```

### Esempio #2 Cancellazione con errore personalizzato

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Motivo: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout superato");
$scope->cancel($error);
```

## Vedi anche

- [Scope::dispose](/it/docs/reference/scope/dispose.html) — Cancella e chiudi lo scope
- [Scope::isCancelled](/it/docs/reference/scope/is-cancelled.html) — Verifica se lo scope e' stato cancellato
- [Scope::awaitAfterCancellation](/it/docs/reference/scope/await-after-cancellation.html) — Attende dopo la cancellazione
