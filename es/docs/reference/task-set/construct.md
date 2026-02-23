---
layout: docs
lang: es
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /es/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Crear un nuevo TaskSet con límite de concurrencia opcional."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Crea un nuevo conjunto de tareas con limpieza automática de resultados tras su entrega.

## Parámetros

**concurrency**
: Número máximo de coroutines ejecutándose simultáneamente.
  `null` — sin límite, todas las tareas se inician inmediatamente.
  Cuando se alcanza el límite, las nuevas tareas se colocan en una cola
  y se inician automáticamente cuando un slot queda disponible.

**scope**
: Scope padre. TaskSet crea un scope hijo para sus coroutines.
  `null` — se hereda el scope actual.

## Ejemplos

### Ejemplo #1 Sin límites

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // se inicia inmediatamente
$set->spawn(fn() => "task 2"); // se inicia inmediatamente
$set->spawn(fn() => "task 3"); // se inicia inmediatamente
```

### Ejemplo #2 Con límite de concurrencia

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // se inicia inmediatamente
$set->spawn(fn() => "task 2"); // se inicia inmediatamente
$set->spawn(fn() => "task 3"); // espera en la cola
```

## Ver también

- [TaskSet::spawn](/es/docs/reference/task-set/spawn.html) — Agregar una tarea
- [TaskGroup::__construct](/es/docs/reference/task-group/construct.html) — Constructor de TaskGroup
