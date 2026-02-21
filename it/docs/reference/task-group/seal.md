---
layout: docs
lang: it
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /it/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Sigilla il gruppo per impedire nuovi task."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

Sigilla il gruppo. Qualsiasi tentativo di utilizzare `spawn()` o `spawnWithKey()` lancerà un'eccezione.
Le coroutine già in esecuzione e i task in coda continuano l'esecuzione.

Le chiamate ripetute non hanno effetto.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->seal();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Vedi anche

- [TaskGroup::cancel](/it/docs/reference/task-group/cancel.html) --- Cancella tutti i task (chiama implicitamente seal)
- [TaskGroup::isSealed](/it/docs/reference/task-group/is-sealed.html) --- Verifica se il gruppo è sigillato
