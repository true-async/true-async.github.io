---
layout: docs
lang: it
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /it/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Posizione di completamento del Future come array."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Restituisce informazioni sulla posizione in cui il `Future` e' stato completato (dove `complete()` o `fail()` e' stato chiamato sul `FutureState` associato). Contiene il nome del file e il numero di riga. Utile per il debug e il tracciamento delle catene asincrone.

## Valore di ritorno

`array` --- un array con le chiavi `file` (stringa, percorso del file) e `line` (intero, numero di riga). Se il Future non e' ancora completato, restituisce un array vuoto.

## Esempi

### Esempio #1 Ottenere la posizione di completamento

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // riga 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### Esempio #2 Confronto tra posizione di creazione e completamento

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## Vedi anche

- [Future::getCompletedLocation](/it/docs/reference/future/get-completed-location.html) --- Posizione di completamento come stringa
- [Future::getCreatedFileAndLine](/it/docs/reference/future/get-created-file-and-line.html) --- Posizione di creazione del Future
- [Future::getAwaitingInfo](/it/docs/reference/future/get-awaiting-info.html) --- Informazioni sulle coroutine in attesa
