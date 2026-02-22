---
layout: docs
lang: es
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /es/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Cancelar todas las tareas del grupo."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Cancela todas las corrutinas en ejecución y las tareas en cola.
Llama implícitamente a `seal()`. Las tareas en cola nunca se inician.

Las corrutinas reciben una `AsyncCancellation` y terminan.
La cancelación ocurre de forma asíncrona — use `awaitCompletion()` para garantizar la finalización.

## Parámetros

**cancellation**
: La excepción que sirve como razón de cancelación. Si es `null`, se usa una `AsyncCancellation` estándar con el mensaje "TaskGroup cancelled".

## Ejemplos

### Ejemplo #1 Cancelación con espera de finalización

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "tarea larga";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "todas las tareas canceladas\n";
});
```

### Ejemplo #2 Cancelación con un motivo

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Tiempo de espera excedido"));
    $group->awaitCompletion();
});
```

## Ver también

- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) — Sellar sin cancelación
- [TaskGroup::awaitCompletion](/es/docs/reference/task-group/await-completion.html) — Esperar la finalización
- [TaskGroup::dispose](/es/docs/reference/task-group/dispose.html) — Disponer del ámbito del grupo
