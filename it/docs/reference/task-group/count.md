---
layout: docs
lang: it
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /it/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Ottiene il numero totale di task nel gruppo."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Restituisce il numero totale di task nel gruppo: in coda, in esecuzione e completati.

TaskGroup implementa l'interfaccia `Countable`, quindi è possibile utilizzare `count($group)`.

## Valore di ritorno

Il numero totale di task (`int`).

## Esempi

### Esempio #1 Conteggio dei task

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## Vedi anche

- [TaskGroup::isFinished](/it/docs/reference/task-group/is-finished.html) --- Verifica se tutti i task sono terminati
- [TaskGroup::isSealed](/it/docs/reference/task-group/is-sealed.html) --- Verifica se il gruppo è sigillato
