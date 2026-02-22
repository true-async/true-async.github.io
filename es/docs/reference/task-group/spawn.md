---
layout: docs
lang: es
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /es/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Agregar una tarea al grupo con una clave auto-incrementada."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Agrega un callable al grupo con una clave auto-incrementada (0, 1, 2, ...).

Si no hay límite de concurrencia establecido o hay un espacio disponible, la corrutina se crea inmediatamente.
En caso contrario, el callable con sus argumentos se coloca en una cola y se inicia cuando un espacio quede disponible.

## Parámetros

**task**
: El callable a ejecutar. Acepta cualquier callable: Closure, función, método.

**args**
: Argumentos pasados al callable.

## Errores

Lanza `Async\AsyncException` si el grupo está sellado (`seal()`) o cancelado (`cancel()`).

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "primero");
    $group->spawn(fn() => "segundo");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(7) "primero"
    var_dump($results[1]); // string(7) "segundo"
});
```

### Ejemplo #2 Con argumentos

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## Ver también

- [TaskGroup::spawnWithKey](/es/docs/reference/task-group/spawn-with-key.html) — Agregar una tarea con una clave explícita
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
