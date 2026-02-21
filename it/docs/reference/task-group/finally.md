---
layout: docs
lang: it
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /it/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Registra un gestore di completamento per il gruppo."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Registra un callback che viene invocato quando il gruppo è sigillato e tutti i task sono completati.
Il callback riceve il TaskGroup come parametro.

Poiché `cancel()` chiama implicitamente `seal()`, il gestore viene attivato anche in caso di cancellazione.

Se il gruppo è già terminato, il callback viene chiamato immediatamente in modo sincrono.

## Parametri

**callback**
: Una Closure che accetta `TaskGroup` come unico argomento.

## Esempi

### Esempio #1 Registrazione del completamento

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Completati: " . $g->count() . " task\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Output:
// Completati: 2 task
```

### Esempio #2 Chiamata su un gruppo già terminato

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Il gruppo è già terminato — il callback viene chiamato in modo sincrono
    $group->finally(function(TaskGroup $g) {
        echo "chiamato immediatamente\n";
    });

    echo "dopo finally\n";
});
// Output:
// chiamato immediatamente
// dopo finally
```

## Vedi anche

- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) --- Sigilla il gruppo
- [TaskGroup::cancel](/it/docs/reference/task-group/cancel.html) --- Cancella i task
