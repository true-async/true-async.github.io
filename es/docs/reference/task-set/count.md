---
layout: docs
lang: es
path_key: "/docs/reference/task-set/count.html"
nav_active: docs
permalink: /es/docs/reference/task-set/count.html
page_title: "TaskSet::count"
description: "Obtener el número de tareas aún no entregadas al consumidor."
---

# TaskSet::count

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::count(): int
```

Devuelve el número de tareas que aún no han sido entregadas al consumidor.

A diferencia de `TaskGroup::count()`, que devuelve el número total de tareas,
`TaskSet::count()` disminuye con cada entrega de resultado mediante
`joinNext()`, `joinAny()`, `joinAll()` o `foreach`.

`TaskSet` implementa `Countable`, por lo que se puede usar `count($set)`.

## Valor de retorno

El número de tareas en el conjunto.

## Ejemplos

### Ejemplo #1 Seguimiento del progreso

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");
    $set->spawn(fn() => "c");

    echo $set->count() . "\n"; // 3

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 2

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 1

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 0
});
```

## Ver también

- [TaskSet::isFinished](/es/docs/reference/task-set/is-finished.html) — Comprobar si todas las tareas han finalizado
- [TaskSet::joinNext](/es/docs/reference/task-set/join-next.html) — Obtener el siguiente resultado
