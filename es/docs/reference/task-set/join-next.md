---
layout: docs
lang: es
path_key: "/docs/reference/task-set/join-next.html"
nav_active: docs
permalink: /es/docs/reference/task-set/join-next.html
page_title: "TaskSet::joinNext"
description: "Obtener el resultado de la primera tarea completada con eliminación automática del conjunto."
---

# TaskSet::joinNext

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinNext(): Async\Future
```

Devuelve un `Future` que se resuelve con el resultado de la primera tarea completada, ya sea exitosa o fallida.
Si la tarea terminó con error, el `Future` se rechaza con esa excepción.

**Tras la entrega del resultado, la entrada se elimina automáticamente del conjunto**, y `count()` disminuye en 1.

Las tareas restantes continúan ejecutándose.

Si ya existe una tarea completada, el `Future` se resuelve inmediatamente.

El `Future` devuelto admite un token de cancelación mediante `await(?Completable $cancellation)`.

## Valor de retorno

`Async\Future` — un resultado futuro de la primera tarea completada.
Llama a `->await()` para obtener el valor.

## Errores

- Lanza `Async\AsyncException` si el conjunto está vacío.
- El `Future` se rechaza con la excepción de la tarea si la primera tarea completada falló con error.

## Ejemplos

### Ejemplo #1 Procesamiento secuencial de resultados

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => fetchUser(1));
    $set->spawn(fn() => fetchUser(2));
    $set->spawn(fn() => fetchUser(3));

    echo "before: count=" . $set->count() . "\n"; // 3

    $first = $set->joinNext()->await();
    echo "after first: count=" . $set->count() . "\n"; // 2

    $second = $set->joinNext()->await();
    echo "after second: count=" . $set->count() . "\n"; // 1
});
```

### Ejemplo #2 Bucle de procesamiento

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    foreach ($urls as $url) {
        $set->spawn(fn() => httpClient()->get($url)->getBody());
    }
    $set->seal();

    while ($set->count() > 0) {
        try {
            $body = $set->joinNext()->await();
            processResponse($body);
        } catch (\Throwable $e) {
            log("Error: {$e->getMessage()}");
        }
    }
});
```

### Ejemplo #3 Con timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());

    try {
        $result = $set->joinNext()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "No task completed within 5 seconds\n";
    }
});
```

## Ver también

- [TaskSet::joinAny](/es/docs/reference/task-set/join-any.html) — Primer resultado exitoso
- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Todos los resultados
- [TaskGroup::race](/es/docs/reference/task-group/race.html) — Equivalente sin limpieza automática
