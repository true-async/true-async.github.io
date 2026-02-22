---
layout: docs
lang: es
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /es/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Sellar el grupo para prevenir nuevas tareas."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
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
    $group->seal();

    try {
        $group->spawn(fn() => "otra tarea");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Ver también

- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) — Cancelar todas las tareas (llama implícitamente a seal)
- [TaskGroup::isSealed](/es/docs/reference/task-group/is-sealed.html) — Verificar si el grupo está sellado
