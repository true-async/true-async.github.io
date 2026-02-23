---
layout: docs
lang: es
path_key: "/docs/reference/task-set/seal.html"
nav_active: docs
permalink: /es/docs/reference/task-set/seal.html
page_title: "TaskSet::seal"
description: "Sellar el conjunto para nuevas tareas."
---

# TaskSet::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::seal(): void
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
    $set->seal();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Ver también

- [TaskSet::cancel](/es/docs/reference/task-set/cancel.html) — Cancelar todas las tareas (llama a seal implícitamente)
- [TaskSet::isSealed](/es/docs/reference/task-set/is-sealed.html) — Comprobar si el conjunto está sellado
