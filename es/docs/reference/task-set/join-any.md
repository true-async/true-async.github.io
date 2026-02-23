---
layout: docs
lang: es
path_key: "/docs/reference/task-set/join-any.html"
nav_active: docs
permalink: /es/docs/reference/task-set/join-any.html
page_title: "TaskSet::joinAny"
description: "Obtener el resultado de la primera tarea completada con éxito, con eliminación automática del conjunto."
---

# TaskSet::joinAny

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAny(): Async\Future
```

Devuelve un `Future` que se resuelve con el resultado de la primera tarea completada *con éxito*.
Las tareas que terminaron con error se omiten.

**Tras la entrega del resultado, la entrada se elimina automáticamente del conjunto.**

Las tareas restantes continúan ejecutándose.

Si todas las tareas terminaron con error, el `Future` se rechaza con `CompositeException`.

El `Future` devuelto admite un token de cancelación mediante `await(?Completable $cancellation)`.

## Valor de retorno

`Async\Future` — un resultado futuro de la primera tarea exitosa.
Llama a `->await()` para obtener el valor.

## Errores

- Lanza `Async\AsyncException` si el conjunto está vacío.
- El `Future` se rechaza con `Async\CompositeException` si todas las tareas terminaron con error.

## Ejemplos

### Ejemplo #1 Primer resultado exitoso

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("fail 1"));
    $set->spawn(fn() => throw new \RuntimeException("fail 2"));
    $set->spawn(fn() => "success!");

    $result = $set->joinAny()->await();
    echo $result . "\n"; // "success!"
    echo $set->count() . "\n"; // 2 (las tareas fallidas permanecen)
});
```

### Ejemplo #2 Todas las tareas fallaron

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => throw new \RuntimeException("err 1"));
    $set->spawn(fn() => throw new \RuntimeException("err 2"));

    $set->seal();

    try {
        $set->joinAny()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errors\n"; // "2 errors"
    }
});
```

### Ejemplo #3 Búsqueda resiliente

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => searchGoogle($query));
    $set->spawn(fn() => searchBing($query));
    $set->spawn(fn() => searchDuckDuckGo($query));

    $result = $set->joinAny()->await(Async\timeout(3.0));
    echo "Found, active: {$set->count()}\n";
});
```

## Ver también

- [TaskSet::joinNext](/es/docs/reference/task-set/join-next.html) — Primera completada (éxito o error)
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Todos los resultados
- [TaskGroup::any](/es/docs/reference/task-group/any.html) — Equivalente sin limpieza automática
