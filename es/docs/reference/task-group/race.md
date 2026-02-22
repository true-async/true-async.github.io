---
layout: docs
lang: es
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /es/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Crear un Future que se resuelve con el resultado de la primera tarea completada."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Devuelve un `Future` que se resuelve con el resultado de la primera tarea completada — ya sea exitosa o fallida.
Si la tarea falló con un error, el `Future` se rechaza con esa excepción.
Las tareas restantes **continúan ejecutándose**.

Si ya existe una tarea completada, el `Future` se resuelve inmediatamente.

El `Future` devuelto soporta un token de cancelación mediante `await(?Completable $cancellation)`.

## Valor de retorno

`Async\Future` — un resultado futuro de la primera tarea completada.
Llame a `->await()` para obtener el valor.

## Errores

- Lanza `Async\AsyncException` si el grupo está vacío.
- El `Future` se rechaza con la excepción de la tarea si la primera tarea completada falló con un error.

## Ejemplos

### Ejemplo #1 Primera respuesta

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "lento"; });
    $group->spawn(fn() => "rápido");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "rápido"
});
```

### Ejemplo #2 Solicitudes hedged con tiempo de espera

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Ninguna réplica respondió en 2 segundos\n";
    }
});
```

## Ver también

- [TaskGroup::any](/es/docs/reference/task-group/any.html) — Primer resultado exitoso
- [TaskGroup::all](/es/docs/reference/task-group/all.html) — Todos los resultados
