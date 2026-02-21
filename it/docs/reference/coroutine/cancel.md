---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Annulla l'esecuzione della coroutine."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Annulla l'esecuzione della coroutine. La coroutine riceverà un'eccezione `AsyncCancellation` al prossimo punto di sospensione (`suspend`, `await`, `delay`, ecc.).

L'annullamento funziona in modo cooperativo -- la coroutine non viene interrotta istantaneamente. Se la coroutine è all'interno di `protect()`, l'annullamento viene posticipato fino al completamento della sezione protetta.

## Parametri

**cancellation**
: L'eccezione che funge da motivo dell'annullamento. Se `null`, viene creata un'`AsyncCancellation` predefinita.

## Esempi

### Esempio #1 Annullamento base

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Annullato: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Esempio #2 Annullamento con motivo

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout superato"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout superato"
}
```

### Esempio #3 Annullamento prima dell'avvio

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "non dovrebbe completarsi";
});

// Annulla prima che lo scheduler avvii la coroutine
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine annullata prima dell'avvio\n";
}
```

## Vedi anche

- [Coroutine::isCancelled](/it/docs/reference/coroutine/is-cancelled.html) -- Verifica l'annullamento
- [Coroutine::isCancellationRequested](/it/docs/reference/coroutine/is-cancellation-requested.html) -- Verifica la richiesta di annullamento
- [Cancellazione](/it/docs/components/cancellation.html) -- Concetto di annullamento
- [protect()](/it/docs/reference/protect.html) -- Sezione protetta
