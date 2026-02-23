---
layout: docs
lang: es
path_key: "/docs/reference/task-set/await-completion.html"
nav_active: docs
permalink: /es/docs/reference/task-set/await-completion.html
page_title: "TaskSet::awaitCompletion"
description: "Esperar a que todas las tareas del conjunto se completen."
---

# TaskSet::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::awaitCompletion(): void
```

Suspende la coroutine actual hasta que todas las tareas del conjunto se hayan completado.

El conjunto **debe** estar sellado antes de llamar a este método.

A diferencia de `joinAll()`, este método no lanza excepciones ante errores de las tareas
y no devuelve resultados.

## Errores

Lanza `Async\AsyncException` si el conjunto no está sellado.

## Ejemplos

### Ejemplo #1 Esperar la finalización

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => processFile("a.txt"));
    $set->spawn(fn() => processFile("b.txt"));
    $set->spawn(fn() => throw new \RuntimeException("error"));

    $set->seal();
    $set->awaitCompletion(); // No lanza excepción aunque las tareas hayan fallado

    echo "All tasks completed\n";
});
```

## Ver también

- [TaskSet::joinAll](/es/docs/reference/task-set/join-all.html) — Esperar y obtener resultados
- [TaskSet::finally](/es/docs/reference/task-set/finally.html) — Handler de finalización
