---
layout: docs
lang: es
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /es/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Crear un Future que se resuelve con un array de todos los resultados de las tareas."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Devuelve un `Future` que se resuelve con un array de resultados cuando todas las tareas se han completado.
Las claves del array coinciden con las claves asignadas mediante `spawn()` / `spawnWithKey()`.

Si las tareas ya se han completado, el `Future` se resuelve inmediatamente.

El `Future` devuelto soporta un token de cancelación mediante `await(?Completable $cancellation)`,
lo que permite establecer un tiempo de espera u otra estrategia de cancelación.

## Parámetros

**ignoreErrors**
: Si es `false` (predeterminado) y hay errores, el `Future` se rechaza con `CompositeException`.
  Si es `true`, los errores se ignoran y el `Future` se resuelve solo con los resultados exitosos.
  Los errores pueden obtenerse mediante `getErrors()`.

## Valor de retorno

`Async\Future` — un resultado futuro que contiene el array de resultados de las tareas.
Llame a `->await()` para obtener el valor.

## Errores

El `Future` se rechaza con `Async\CompositeException` si `$ignoreErrors = false` y al menos una tarea falló con un error.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Ejemplo #2 Manejo de errores

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fallo"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fallo"
        }
    }
});
```

### Ejemplo #3 Ignorar errores

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fallo"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Ejemplo #4 Espera con tiempo de espera

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "No se pudieron obtener los datos en 5 segundos\n";
    }
});
```

## Ver también

- [TaskGroup::awaitCompletion](/es/docs/reference/task-group/await-completion.html) — Esperar la finalización sin excepciones
- [TaskGroup::getResults](/es/docs/reference/task-group/get-results.html) — Obtener resultados sin esperar
- [TaskGroup::getErrors](/es/docs/reference/task-group/get-errors.html) — Obtener errores
