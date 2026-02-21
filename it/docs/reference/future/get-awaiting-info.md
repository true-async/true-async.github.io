---
layout: docs
lang: it
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /it/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Informazioni di debug sulle coroutine in attesa."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Restituisce informazioni di debug sulle coroutine che stanno attualmente attendendo il completamento di questo `Future`. Utile per diagnosticare deadlock e analizzare le dipendenze tra coroutine.

## Valore di ritorno

`array` --- un array con informazioni sulle coroutine in attesa.

## Esempi

### Esempio #1 Ottenere informazioni sui coroutine in attesa

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Avvia diverse coroutine in attesa di un singolo Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Dai tempo alle coroutine di iniziare l'attesa
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array con informazioni sulle coroutine in attesa

$state->complete("done");
```

## Vedi anche

- [Future::getCreatedFileAndLine](/it/docs/reference/future/get-created-file-and-line.html) --- Posizione di creazione del Future
- [Future::getCreatedLocation](/it/docs/reference/future/get-created-location.html) --- Posizione di creazione come stringa
- [Future::await](/it/docs/reference/future/await.html) --- Attende il risultato
