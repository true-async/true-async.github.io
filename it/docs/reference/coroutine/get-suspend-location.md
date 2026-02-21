---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Ottieni la posizione di sospensione della coroutine come stringa."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Restituisce la posizione di sospensione della coroutine nel formato `"file:riga"`. Se l'informazione non è disponibile, restituisce `"unknown"`.

## Valore di ritorno

`string` -- una stringa come `"/app/script.php:42"` o `"unknown"`.

## Esempi

### Esempio #1 Diagnosi di una coroutine bloccata

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // bloccata qui
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} in attesa a: {$coro->getSuspendLocation()}\n";
    }
}
```

## Vedi anche

- [Coroutine::getSuspendFileAndLine](/it/docs/reference/coroutine/get-suspend-file-and-line.html) -- File e riga come array
- [Coroutine::getSpawnLocation](/it/docs/reference/coroutine/get-spawn-location.html) -- Posizione di creazione
- [Coroutine::getTrace](/it/docs/reference/coroutine/get-trace.html) -- Stack completo delle chiamate
