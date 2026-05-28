---
layout: docs
lang: es
path_key: "/docs/reference/task-set/finally.html"
nav_active: docs
permalink: /es/docs/reference/task-set/finally.html
page_title: "TaskSet::finally"
description: "Registrar un handler de finalización para el conjunto."
---

# TaskSet::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::finally(Closure $callback): void
```

Registra un callback que se invoca cuando el conjunto está sellado y todas las tareas se han completado.
El callback recibe el TaskSet como parámetro.

Dado que `cancel()` llama implícitamente a `close()`, el handler también se dispara al cancelar.

Si el conjunto ya ha finalizado, el callback se invoca de forma síncrona inmediatamente.

## Parámetros

**callback**
: Closure que acepta `TaskSet` como único argumento.

## Ejemplos

### Ejemplo #1 Registro de finalización

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->finally(function(TaskSet $s) {
        echo "Set completed\n";
    });

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");

    $set->close();
    $set->joinAll()->await();
});
// Output:
// Set completed
```

### Ejemplo #2 Llamada en un conjunto ya finalizado

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();
    $set->spawn(fn() => 1);
    $set->close();
    $set->joinAll()->await();

    // El conjunto ya finalizó — el callback se invoca síncronamente
    $set->finally(function(TaskSet $s) {
        echo "called immediately\n";
    });

    echo "after finally\n";
});
// Output:
// called immediately
// after finally
```

## Ver también

- [TaskSet::close](/es/docs/reference/task-set/close.html) — Sellar el conjunto
- [TaskSet::awaitCompletion](/es/docs/reference/task-set/await-completion.html) — Esperar la finalización
