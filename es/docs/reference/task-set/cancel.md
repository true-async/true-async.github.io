---
layout: docs
lang: es
path_key: "/docs/reference/task-set/cancel.html"
nav_active: docs
permalink: /es/docs/reference/task-set/cancel.html
page_title: "TaskSet::cancel"
description: "Cancelar todas las tareas del conjunto."
---

# TaskSet::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancela todas las coroutines en ejecución y vacía la cola de tareas.
Llama implícitamente a `seal()`.

## Parámetros

**cancellation**
: Motivo de la cancelación. Si es `null`, se crea un `AsyncCancellation` por defecto.

## Ejemplos

### Ejemplo #1 Cancelación condicional

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask1());
    $set->spawn(fn() => longRunningTask2());

    // Cancelar todas las tareas
    $set->cancel();

    echo $set->isSealed() ? "sealed\n" : "no\n"; // "sealed"
});
```

## Ver también

- [TaskSet::seal](/es/docs/reference/task-set/seal.html) — Sellar el conjunto
- [TaskSet::dispose](/es/docs/reference/task-set/dispose.html) — Destruir el scope del conjunto
