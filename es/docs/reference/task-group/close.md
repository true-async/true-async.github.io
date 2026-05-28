---
layout: docs
lang: es
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /es/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Cerrar el grupo para prevenir nuevas tareas."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

Sella el grupo. Cualquier intento de usar `spawn()` o `spawnWithKey()` lanzará una excepción.
Las corrutinas en ejecución y las tareas en cola continúan ejecutándose.

Las llamadas repetidas son una no-op.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "tarea");
    $group->close();

    try {
        $group->spawn(fn() => "otra tarea");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Ver también

- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) — Cancelar todas las tareas (llama implícitamente a close)
- [TaskGroup::isClosed](/es/docs/reference/task-group/is-closed.html) — Verificar si el grupo está cerrado
