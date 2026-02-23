---
layout: docs
lang: es
path_key: "/docs/reference/task-set/join-all.html"
nav_active: docs
permalink: /es/docs/reference/task-set/join-all.html
page_title: "TaskSet::joinAll"
description: "Esperar todas las tareas y obtener un array de resultados con limpieza automática del conjunto."
---

# TaskSet::joinAll

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAll(bool $ignoreErrors = false): Async\Future
```

Devuelve un `Future` que se resuelve con un array de resultados cuando todas las tareas se han completado.
Las claves del array corresponden a las asignadas durante `spawn()` / `spawnWithKey()`.

**Tras la entrega de los resultados, todas las entradas se eliminan automáticamente del conjunto**, y `count()` pasa a ser 0.

Si las tareas ya están completadas, el `Future` se resuelve inmediatamente.

El `Future` devuelto admite un token de cancelación mediante `await(?Completable $cancellation)`.

## Parámetros

**ignoreErrors**
: Si es `false` (por defecto) y hay errores, el `Future` se rechaza con `CompositeException`.
  Si es `true`, los errores se ignoran y el `Future` se resuelve solo con los resultados exitosos.

## Valor de retorno

`Async\Future` — un resultado futuro que contiene un array de resultados de las tareas.
Llama a `->await()` para obtener el valor.

## Errores

El `Future` se rechaza con `Async\CompositeException` si `$ignoreErrors = false` y al menos una tarea terminó con error.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('a', fn() => 10);
    $set->spawnWithKey('b', fn() => 20);
    $set->spawnWithKey('c', fn() => 30);

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)

    echo $set->count() . "\n"; // 0
});
```

### Ejemplo #2 Manejo de errores

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    try {
        $set->joinAll()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Ejemplo #3 Ignorando errores

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    $results = $set->joinAll(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1
});
```

### Ejemplo #4 Espera con timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());
    $set->seal();

    try {
        $results = $set->joinAll()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "No se pudieron obtener los datos en 5 segundos\n";
    }
});
```

## Ver también

- [TaskSet::joinNext](/es/docs/reference/task-set/join-next.html) — Resultado de la primera tarea completada
- [TaskSet::joinAny](/es/docs/reference/task-set/join-any.html) — Resultado de la primera tarea exitosa
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Equivalente sin limpieza automática
