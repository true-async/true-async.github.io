---
layout: docs
lang: it
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /it/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Crea un nuovo TaskGroup con un limite di concorrenza opzionale."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Crea un nuovo gruppo di task.

## Parametri

**concurrency**
: Numero massimo di coroutine in esecuzione contemporanea.
  `null` --- nessun limite, tutti i task vengono avviati immediatamente.
  Quando il limite viene raggiunto, i nuovi task vengono messi in coda
  e avviati automaticamente quando uno slot si libera.

**scope**
: Scope padre. TaskGroup crea uno scope figlio per le sue coroutine.
  `null` --- viene ereditato lo scope corrente.

## Esempi

### Esempio #1 Senza limiti

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // parte immediatamente
$group->spawn(fn() => "task 2"); // parte immediatamente
$group->spawn(fn() => "task 3"); // parte immediatamente
```

### Esempio #2 Con limite di concorrenza

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // parte immediatamente
$group->spawn(fn() => "task 2"); // parte immediatamente
$group->spawn(fn() => "task 3"); // attende in coda
```

## Vedi anche

- [TaskGroup::spawn](/it/docs/reference/task-group/spawn.html) --- Aggiunge un task
- [Scope](/it/docs/components/scope.html) --- Gestione del ciclo di vita delle coroutine
