---
layout: docs
lang: es
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /es/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Agregar una tarea al grupo con una clave explícita."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Agrega un callable al grupo con la clave especificada.
El resultado de la tarea será accesible por esta clave en `all()`, `getResults()` y durante la iteración.

## Parámetros

**key**
: La clave de la tarea. Una cadena o entero. No se permiten duplicados.

**task**
: El callable a ejecutar.

**args**
: Argumentos pasados al callable.

## Errores

Lanza `Async\AsyncException` si el grupo está sellado o la clave ya existe.

## Ejemplos

### Ejemplo #1 Tareas con nombre

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## Ver también

- [TaskGroup::spawn](/es/docs/reference/task-group/spawn.html) — Agregar una tarea con una clave auto-incrementada
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
