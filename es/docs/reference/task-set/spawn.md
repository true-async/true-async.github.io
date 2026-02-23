---
layout: docs
lang: es
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /es/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Agregar una tarea al conjunto con clave auto-incremental."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Agrega un callable al conjunto con una clave auto-incremental (0, 1, 2, ...).

Si no hay límite de concurrencia configurado o hay un slot disponible, la coroutine se crea inmediatamente.
De lo contrario, el callable con sus argumentos se coloca en una cola y se inicia cuando un slot quede disponible.

## Parámetros

**task**
: Callable a ejecutar. Acepta cualquier callable: Closure, función, método.

**args**
: Argumentos pasados al callable.

## Errores

Lanza `Async\AsyncException` si el conjunto está sellado (`seal()`) o cancelado (`cancel()`).

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "first");
    $set->spawn(fn() => "second");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Ejemplo #2 Con argumentos

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## Ver también

- [TaskSet::spawnWithKey](/es/docs/reference/task-set/spawn-with-key.html) — Agregar una tarea con clave explícita
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Esperar todas las tareas
