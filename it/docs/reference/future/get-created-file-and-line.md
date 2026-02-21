---
layout: docs
lang: it
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /it/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Posizione di creazione del Future come array."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Restituisce informazioni sulla posizione di creazione del `Future` come array. Contiene il nome del file e il numero di riga in cui questo Future e' stato creato. Utile per il debug e il tracciamento.

## Valore di ritorno

`array` --- un array con le chiavi `file` (stringa, percorso del file) e `line` (intero, numero di riga).

## Esempi

### Esempio #1 Ottenere la posizione di creazione

```php
<?php

use Async\Future;

$future = Future::completed(42); // riga 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### Esempio #2 Logging delle informazioni del Future

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## Vedi anche

- [Future::getCreatedLocation](/it/docs/reference/future/get-created-location.html) --- Posizione di creazione come stringa
- [Future::getCompletedFileAndLine](/it/docs/reference/future/get-completed-file-and-line.html) --- Posizione di completamento del Future
- [Future::getAwaitingInfo](/it/docs/reference/future/get-awaiting-info.html) --- Informazioni sulle coroutine in attesa
