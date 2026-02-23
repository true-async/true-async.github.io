---
layout: docs
lang: es
path_key: "/docs/reference/task-set/get-iterator.html"
nav_active: docs
permalink: /es/docs/reference/task-set/get-iterator.html
page_title: "TaskSet::getIterator"
description: "Obtener un iterador para recorrer resultados con limpieza automática."
---

# TaskSet::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::getIterator(): Iterator
```

Devuelve un iterador que produce resultados **a medida que las tareas se completan**.
TaskSet implementa `IteratorAggregate`, por lo que se puede usar `foreach` directamente.

**Cada entrada procesada se elimina automáticamente del conjunto**, liberando memoria
y disminuyendo `count()`.

## Comportamiento del iterador

- `foreach` suspende la coroutine actual hasta que el siguiente resultado esté disponible
- La clave es la misma asignada durante `spawn()` o `spawnWithKey()`
- El valor es un array `[mixed $result, ?Throwable $error]`:
  - Éxito: `[$result, null]`
  - Error: `[null, $error]`
- La iteración termina cuando el conjunto está sellado **y** todas las tareas han sido procesadas
- Si el conjunto no está sellado, `foreach` se suspende esperando nuevas tareas

> **Importante:** Sin llamar a `seal()`, la iteración esperará indefinidamente.

## Ejemplos

### Ejemplo #1 Procesamiento en flujo

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    for ($i = 0; $i < 100; $i++) {
        $set->spawn(fn() => processItem($items[$i]));
    }
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key: error — {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key: done\n";
        // Entrada eliminada, memoria liberada
    }

    echo $set->count() . "\n"; // 0
});
```

### Ejemplo #2 Claves con nombre

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('users', fn() => fetchUsers());
    $set->spawnWithKey('orders', fn() => fetchOrders());
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: received " . count($result) . " records\n";
        }
    }
});
```

## Ver también

- [TaskSet::seal](/es/docs/reference/task-set/seal.html) — Sellar el conjunto
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Esperar todas las tareas
- [TaskSet::joinNext](/es/docs/reference/task-set/join-next.html) — Siguiente resultado
