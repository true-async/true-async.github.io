---
layout: docs
lang: es
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /es/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "Esperar a que todas las tareas se completen sin lanzar excepciones."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

Espera hasta que todas las tareas del grupo se hayan completado completamente.
A diferencia de `all()`, no devuelve resultados ni lanza excepciones por errores de tareas.

El grupo debe estar sellado antes de llamar a este método.

Un caso de uso típico es esperar a que las corrutinas terminen realmente después de `cancel()`.
El método `cancel()` inicia la cancelación, pero las corrutinas pueden finalizar de forma asíncrona.
`awaitCompletion()` garantiza que todas las corrutinas se han detenido.

## Errores

Lanza `Async\AsyncException` si el grupo no está sellado.

## Ejemplos

### Ejemplo #1 Espera después de cancel

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "resultado";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "todas las corrutinas finalizaron\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### Ejemplo #2 Obtener resultados después de esperar

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fallo"));

    $group->seal();
    $group->awaitCompletion();

    // Sin excepciones — verificar manualmente
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "Exitosas: " . count($results) . "\n"; // 1
    echo "Errores: " . count($errors) . "\n";   // 1
});
```

## Ver también

- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Esperar todas las tareas y obtener resultados
- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) — Cancelar todas las tareas
- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) — Sellar el grupo
