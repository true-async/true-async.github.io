---
layout: docs
lang: it
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /it/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Annulla il Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Annulla il `Future`. Tutte le coroutine in attesa di questo Future tramite `await()` riceveranno una `CancelledException`. Se viene fornito il parametro `$cancellation`, verra' utilizzato come motivo dell'annullamento.

## Parametri

`cancellation` --- un'eccezione di annullamento personalizzata. Se `null`, viene utilizzata la `CancelledException` predefinita.

## Valore di ritorno

La funzione non restituisce alcun valore.

## Esempi

### Esempio #1 Annullamento base del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Una coroutine in attesa del risultato
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// Annulla il Future
$future->cancel();
```

### Esempio #2 Annullamento con motivo personalizzato

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## Vedi anche

- [Future::isCancelled](/it/docs/reference/future/is-cancelled.html) --- Verifica se il Future e' annullato
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato
- [Future::catch](/it/docs/reference/future/catch.html) --- Gestisce gli errori del Future
