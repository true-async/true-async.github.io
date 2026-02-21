---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Ottieni il file e la riga dove la coroutine è stata creata."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Restituisce il file e il numero di riga dove `spawn()` è stato chiamato per creare questa coroutine.

## Valore di ritorno

`array` -- un array di due elementi:
- `[0]` -- nome del file (`string` o `null`)
- `[1]` -- numero di riga (`int`)

## Esempi

### Esempio #1 Uso base

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // riga 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Riga: $line\n"; // 5
```

## Vedi anche

- [Coroutine::getSpawnLocation](/it/docs/reference/coroutine/get-spawn-location.html) -- Posizione di creazione come stringa
- [Coroutine::getSuspendFileAndLine](/it/docs/reference/coroutine/get-suspend-file-and-line.html) -- File e riga di sospensione
