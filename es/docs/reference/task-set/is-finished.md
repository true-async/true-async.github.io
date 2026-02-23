---
layout: docs
lang: es
path_key: "/docs/reference/task-set/is-finished.html"
nav_active: docs
permalink: /es/docs/reference/task-set/is-finished.html
page_title: "TaskSet::isFinished"
description: "Comprobar si todas las tareas del conjunto han finalizado."
---

# TaskSet::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isFinished(): bool
```

Devuelve `true` si no hay coroutines activas y la cola de tareas está vacía.

Si el conjunto no está sellado, este estado puede ser temporal — se pueden
agregar nuevas tareas mediante `spawn()`.

## Valor de retorno

`true` si todas las tareas han finalizado. `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Comprobación de estado

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isFinished() ? "yes\n" : "no\n"; // "yes"

    $set->spawn(fn() => "task");
    echo $set->isFinished() ? "yes\n" : "no\n"; // "no"

    $set->seal();
    $set->joinAll()->await();
    echo $set->isFinished() ? "yes\n" : "no\n"; // "yes"
});
```

## Ver también

- [TaskSet::isSealed](/es/docs/reference/task-set/is-sealed.html) — Comprobar si el conjunto está sellado
- [TaskSet::count](/es/docs/reference/task-set/count.html) — Número de tareas
