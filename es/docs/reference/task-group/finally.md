---
layout: docs
lang: es
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /es/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Registrar un manejador de finalización para el grupo."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Registra un callback que se invoca cuando el grupo está sellado y todas las tareas se han completado.
El callback recibe el TaskGroup como parámetro.

Dado que `cancel()` llama implícitamente a `seal()`, el manejador también se dispara en la cancelación.

Si el grupo ya ha finalizado, el callback se llama de forma sincrónica inmediatamente.

## Parámetros

**callback**
: Un Closure que recibe `TaskGroup` como su único argumento.

## Ejemplos

### Ejemplo #1 Registro de finalización

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Completadas: " . $g->count() . " tareas\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Salida:
// Completadas: 2 tareas
```

### Ejemplo #2 Llamada en un grupo ya finalizado

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // El grupo ya finalizó — el callback se llama de forma sincrónica
    $group->finally(function(TaskGroup $g) {
        echo "llamado inmediatamente\n";
    });

    echo "después de finally\n";
});
// Salida:
// llamado inmediatamente
// después de finally
```

## Ver también

- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) — Sellar el grupo
- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) — Cancelar tareas
