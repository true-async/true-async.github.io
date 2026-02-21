---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Ottieni la posizione di creazione della coroutine come stringa."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Restituisce la posizione di creazione della coroutine nel formato `"file:riga"`. Se l'informazione non è disponibile, restituisce `"unknown"`.

## Valore di ritorno

`string` -- una stringa come `"/app/script.php:42"` o `"unknown"`.

## Esempi

### Esempio #1 Output di debug

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Creata a: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Creata a: /app/script.php:5"
```

### Esempio #2 Logging di tutte le coroutine

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} creata a {$coro->getSpawnLocation()}\n";
}
```

## Vedi anche

- [Coroutine::getSpawnFileAndLine](/it/docs/reference/coroutine/get-spawn-file-and-line.html) -- File e riga come array
- [Coroutine::getSuspendLocation](/it/docs/reference/coroutine/get-suspend-location.html) -- Posizione di sospensione
- [get_coroutines()](/it/docs/reference/get-coroutines.html) -- Tutte le coroutine attive
