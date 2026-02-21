---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Verifica se la coroutine è attualmente in esecuzione."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Verifica se la coroutine è attualmente in esecuzione. Una coroutine è considerata in esecuzione se è stata avviata e non è ancora completata.

## Valore di ritorno

`bool` -- `true` se la coroutine è in esecuzione e non completata.

## Esempi

### Esempio #1 Verifica dello stato di esecuzione

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // All'interno della coroutine isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// All'esterno -- la coroutine è sospesa o non ancora avviata
var_dump($coroutine->isRunning()); // bool(false)
```

## Vedi anche

- [Coroutine::isStarted](/it/docs/reference/coroutine/is-started.html) -- Verifica se avviata
- [Coroutine::isSuspended](/it/docs/reference/coroutine/is-suspended.html) -- Verifica la sospensione
- [Coroutine::isCompleted](/it/docs/reference/coroutine/is-completed.html) -- Verifica il completamento
