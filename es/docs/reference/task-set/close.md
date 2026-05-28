---
layout: docs
lang: es
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /es/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "Sellar el conjunto para nuevas tareas."
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
```

Sella el conjunto. Después de esto, `spawn()` y `spawnWithKey()` lanzan una excepción.
Las coroutines en ejecución y las tareas en cola continúan funcionando.

Las llamadas repetidas no tienen efecto.

## Ejemplos

### Ejemplo #1 Uso básico

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "task");
    $set->close();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Ver también

- [TaskSet::cancel](/es/docs/reference/task-set/cancel.html) — Cancelar todas las tareas (llama a seal implícitamente)
- [TaskSet::isClosed](/es/docs/reference/task-set/is-closed.html) — Comprobar si el conjunto está sellado
