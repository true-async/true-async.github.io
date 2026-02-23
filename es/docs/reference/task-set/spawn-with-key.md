---
layout: docs
lang: es
path_key: "/docs/reference/task-set/spawn-with-key.html"
nav_active: docs
permalink: /es/docs/reference/task-set/spawn-with-key.html
page_title: "TaskSet::spawnWithKey"
description: "Agregar una tarea al conjunto con una clave explícita."
---

# TaskSet::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Agrega un callable al conjunto con una clave especificada. La clave se usa en el array de resultados
y durante la iteración mediante `foreach`.

## Parámetros

**key**
: Clave del resultado. Debe ser única dentro del conjunto.

**task**
: Callable a ejecutar.

**args**
: Argumentos pasados al callable.

## Errores

- Lanza `Async\AsyncException` si el conjunto está sellado o cancelado.
- Lanza `Async\AsyncException` si la clave ya está en uso.

## Ejemplos

### Ejemplo #1 Tareas con nombre

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('user',   fn() => fetchUser($id));
    $set->spawnWithKey('orders', fn() => fetchOrders($id));

    $set->seal();
    $data = $set->joinAll()->await();

    echo $data['user']['name'];
    echo count($data['orders']);
});
```

## Ver también

- [TaskSet::spawn](/es/docs/reference/task-set/spawn.html) — Agregar una tarea con clave automática
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Esperar todas las tareas
