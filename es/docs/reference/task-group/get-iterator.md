---
layout: docs
lang: es
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /es/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Obtener un iterador para recorrer los resultados a medida que las tareas se completan."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Devuelve un iterador que produce resultados **a medida que las tareas se completan**.
TaskGroup implementa `IteratorAggregate`, por lo que puede usar `foreach` directamente.

## Comportamiento del iterador

- `foreach` suspende la corrutina actual hasta que el siguiente resultado esté disponible
- La clave es la misma que la asignada mediante `spawn()` o `spawnWithKey()`
- El valor es un array `[mixed $result, ?Throwable $error]`:
  - Éxito: `[$result, null]`
  - Error: `[null, $error]`
- La iteración termina cuando el grupo está sellado **y** todas las tareas han sido procesadas
- Si el grupo no está sellado, `foreach` se suspende esperando nuevas tareas

> **Importante:** Sin llamar a `seal()`, la iteración esperará indefinidamente.

## Ejemplos

### Ejemplo #1 Procesar resultados a medida que están listos

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Tarea $key falló: {$error->getMessage()}\n";
            continue;
        }
        echo "Tarea $key completada\n";
    }
});
```

### Ejemplo #2 Iteración con claves nombradas

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: recibidos " . count($result) . " registros\n";
        }
    }
});
```

## Ver también

- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) — Sellar el grupo
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
- [TaskGroup::getResults](/es/docs/reference/task-group/get-results.html) — Obtener un array de resultados
