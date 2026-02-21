---
layout: docs
lang: it
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /it/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Aggiunge un task al gruppo con una chiave auto-incrementante."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Aggiunge un callable al gruppo con una chiave auto-incrementante (0, 1, 2, ...).

Se non è impostato un limite di concorrenza o uno slot è disponibile, la coroutine viene creata immediatamente.
Altrimenti, il callable con i suoi argomenti viene messo in coda e avviato quando uno slot si libera.

## Parametri

**task**
: Il callable da eseguire. Accetta qualsiasi callable: Closure, funzione, metodo.

**args**
: Argomenti passati al callable.

## Errori

Lancia `Async\AsyncException` se il gruppo è sigillato (`seal()`) o cancellato (`cancel()`).

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Esempio #2 Con argomenti

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## Vedi anche

- [TaskGroup::spawnWithKey](/it/docs/reference/task-group/spawn-with-key.html) --- Aggiunge un task con una chiave esplicita
- [TaskGroup::all](/it/docs/reference/task-group/all.html) --- Attende tutti i task
