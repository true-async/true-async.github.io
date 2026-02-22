---
layout: docs
lang: es
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /es/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Obtener un array de errores de las tareas fallidas."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Devuelve un array de excepciones (`Throwable`) de las tareas que fallaron con un error.
Las claves del array coinciden con las claves de las tareas de `spawn()` o `spawnWithKey()`.

El método no espera a que las tareas se completen — solo devuelve los errores disponibles en el momento de la llamada.

## Valor de retorno

Un `array<int|string, Throwable>` donde la clave es el identificador de la tarea y el valor es la excepción.

## Ejemplos

### Ejemplo #1 Ver errores

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## Errores no manejados

Si quedan errores no manejados cuando un TaskGroup es destruido, el destructor lo señala.
Los errores se consideran manejados si:

- Se llama a `all()` con `ignoreErrors: false` (predeterminado) y lanza una `CompositeException`
- Se llama a `suppressErrors()`
- Los errores se manejan a través del iterador (`foreach`)

## Ver también

- [TaskGroup::getResults](/es/docs/reference/task-group/get-results.html) — Obtener un array de resultados
- [TaskGroup::suppressErrors](/es/docs/reference/task-group/suppress-errors.html) — Marcar errores como manejados
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
