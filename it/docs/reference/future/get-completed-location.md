---
layout: docs
lang: it
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /it/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Posizione di completamento del Future come stringa."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Restituisce informazioni sulla posizione di completamento del `Future` come stringa formattata. Comodo per il logging e il debug.

## Valore di ritorno

`string` --- una stringa nel formato `file:line`, ad esempio `/app/worker.php:15`. Se il Future non e' ancora completato, restituisce una stringa vuota.

## Esempi

### Esempio #1 Ottenere la posizione di completamento come stringa

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Esempio #2 Tracciamento completo del ciclo di vita del Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## Vedi anche

- [Future::getCompletedFileAndLine](/it/docs/reference/future/get-completed-file-and-line.html) --- Posizione di completamento come array
- [Future::getCreatedLocation](/it/docs/reference/future/get-created-location.html) --- Posizione di creazione come stringa
- [Future::getAwaitingInfo](/it/docs/reference/future/get-awaiting-info.html) --- Informazioni sulle coroutine in attesa
