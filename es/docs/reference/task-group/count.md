---
layout: docs
lang: es
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /es/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Obtener el número total de tareas en el grupo."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Devuelve el número total de tareas en el grupo: en cola, en ejecución y completadas.

TaskGroup implementa la interfaz `Countable`, por lo que puede usar `count($group)`.

## Valor de retorno

El número total de tareas (`int`).

## Ejemplos

### Ejemplo #1 Conteo de tareas

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

## Ver también

- [TaskGroup::isFinished](/es/docs/reference/task-group/is-finished.html) — Verificar si todas las tareas han finalizado
- [TaskGroup::isSealed](/es/docs/reference/task-group/is-sealed.html) — Verificar si el grupo está sellado
