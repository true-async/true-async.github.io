---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Ottieni il file e la riga dove la coroutine è sospesa."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Restituisce il file e il numero di riga dove la coroutine è stata sospesa (o è stata sospesa l'ultima volta).

## Valore di ritorno

`array` -- un array di due elementi:
- `[0]` -- nome del file (`string` o `null`)
- `[1]` -- numero di riga (`int`)

## Esempi

### Esempio #1 Uso base

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // riga 7
});

suspend(); // lascia che la coroutine si sospenda

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Sospesa a: $file:$line\n"; // /app/script.php:7
```

## Vedi anche

- [Coroutine::getSuspendLocation](/it/docs/reference/coroutine/get-suspend-location.html) -- Posizione di sospensione come stringa
- [Coroutine::getSpawnFileAndLine](/it/docs/reference/coroutine/get-spawn-file-and-line.html) -- File e riga di creazione
