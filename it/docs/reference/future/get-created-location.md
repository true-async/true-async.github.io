---
layout: docs
lang: it
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /it/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Posizione di creazione del Future come stringa."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Restituisce informazioni sulla posizione di creazione del `Future` come stringa formattata. Comodo per il logging e l'output di debug.

## Valore di ritorno

`string` --- una stringa nel formato `file:line`, ad esempio `/app/script.php:42`.

## Esempi

### Esempio #1 Ottenere la posizione di creazione come stringa

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Esempio #2 Utilizzo nei messaggi di debug

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Debug dei Future di lunga durata
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## Vedi anche

- [Future::getCreatedFileAndLine](/it/docs/reference/future/get-created-file-and-line.html) --- Posizione di creazione come array
- [Future::getCompletedLocation](/it/docs/reference/future/get-completed-location.html) --- Posizione di completamento come stringa
- [Future::getAwaitingInfo](/it/docs/reference/future/get-awaiting-info.html) --- Informazioni sulle coroutine in attesa
