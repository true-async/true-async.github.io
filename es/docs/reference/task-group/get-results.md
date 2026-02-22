---
layout: docs
lang: es
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /es/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Obtener un array de resultados de las tareas completadas."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Devuelve un array de resultados de las tareas completadas exitosamente.
Las claves del array coinciden con las claves asignadas mediante `spawn()` (auto-incremento) o `spawnWithKey()` (personalizada).

El método no espera a que las tareas se completen — solo devuelve los resultados disponibles en el momento de la llamada.

## Valor de retorno

Un `array<int|string, mixed>` donde la clave es el identificador de la tarea y el valor es el resultado de la ejecución.

## Ejemplos

### Ejemplo #1 Obtener resultados después de all()

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Ejemplo #2 Los resultados no contienen errores

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fallo"); });
    $group->spawn(fn() => "también ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "también ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fallo")]

    $group->suppressErrors();
});
```

## Ver también

- [TaskGroup::getErrors](/es/docs/reference/task-group/get-errors.html) — Obtener un array de errores
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
- [TaskGroup::suppressErrors](/es/docs/reference/task-group/suppress-errors.html) — Marcar errores como manejados
