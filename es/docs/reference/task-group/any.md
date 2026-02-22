---
layout: docs
lang: es
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /es/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Crear un Future que se resuelve con el resultado de la primera tarea exitosa."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Devuelve un `Future` que se resuelve con el resultado de la primera tarea completada *exitosamente*.
Las tareas que fallaron con un error se omiten.
Las tareas restantes **continúan ejecutándose**.

Si todas las tareas fallan con errores, el `Future` se rechaza con `CompositeException`.

El `Future` devuelto soporta un token de cancelación mediante `await(?Completable $cancellation)`.

## Valor de retorno

`Async\Future` — un resultado futuro de la primera tarea exitosa.
Llame a `->await()` para obtener el valor.

## Errores

- Lanza `Async\AsyncException` si el grupo está vacío.
- El `Future` se rechaza con `Async\CompositeException` si todas las tareas fallan con errores.

## Ejemplos

### Ejemplo #1 Primera exitosa

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fallo 1"));
    $group->spawn(fn() => throw new \RuntimeException("fallo 2"));
    $group->spawn(fn() => "éxito!");

    $result = $group->any()->await();
    echo $result . "\n"; // "éxito!"

    // Los errores de las tareas fallidas deben suprimirse explícitamente
    $group->suppressErrors();
});
```

### Ejemplo #2 Todas fallaron

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errores\n"; // "2 errores"
    }
});
```

### Ejemplo #3 Búsqueda resiliente con tiempo de espera

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Ningún proveedor respondió en 3 segundos\n";
    }

    $group->suppressErrors();
});
```

## Ver también

- [TaskGroup::race](/es/docs/reference/task-group/race.html) — Primera completada (éxito o error)
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Todos los resultados
