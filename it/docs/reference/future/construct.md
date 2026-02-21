---
layout: docs
lang: it
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /it/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Crea un Future associato a un FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Crea un nuovo `Future` associato a un oggetto `FutureState`. `FutureState` gestisce lo stato del Future e permette di completarlo esternamente con un risultato o un errore.

## Parametri

`state` --- l'oggetto `FutureState` che gestisce lo stato di questo Future.

## Esempi

### Esempio #1 Creazione di un Future tramite FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Completa il Future da un'altra coroutine
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Attende il risultato
$value = $future->await();
echo "Received: $value\n";
```

### Esempio #2 Creazione di un Future con risultato differito

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// Una coroutine attende il risultato
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Result: $result\n";
});

// Un'altra coroutine fornisce il risultato
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Done!");
});
```

## Vedi anche

- [Future::completed](/it/docs/reference/future/completed.html) --- Crea un Future gia' completato
- [Future::failed](/it/docs/reference/future/failed.html) --- Crea un Future con un errore
