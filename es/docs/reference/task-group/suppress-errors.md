---
layout: docs
lang: es
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /es/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Marcar todos los errores actuales como manejados."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Marca todos los errores actuales del grupo como manejados.

Cuando un TaskGroup es destruido, verifica si hay errores no manejados. Si los errores no fueron manejados
(mediante `all()`, `foreach` o `suppressErrors()`), el destructor señala errores perdidos.
Llamar a `suppressErrors()` es una confirmación explícita de que los errores han sido manejados.

## Ejemplos

### Ejemplo #1 Suprimir errores después de manejo selectivo

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fallo 1"); });
    $group->spawn(function() { throw new \LogicException("fallo 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Manejar errores manualmente
    foreach ($group->getErrors() as $key => $error) {
        log_error("Tarea $key: {$error->getMessage()}");
    }

    // Marcar errores como manejados
    $group->suppressErrors();
});
```

## Ver también

- [TaskGroup::getErrors](/es/docs/reference/task-group/get-errors.html) — Obtener un array de errores
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas
