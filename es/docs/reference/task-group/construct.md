---
layout: docs
lang: es
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /es/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Crear un nuevo TaskGroup con límite de concurrencia opcional."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Crea un nuevo grupo de tareas.

## Parámetros

**concurrency**
: Número máximo de corrutinas ejecutándose simultáneamente.
  `null` — sin límite, todas las tareas se inician inmediatamente.
  Cuando se alcanza el límite, las nuevas tareas se colocan en una cola
  y se inician automáticamente cuando un espacio queda disponible.

**scope**
: Ámbito padre. TaskGroup crea un ámbito hijo para sus corrutinas.
  `null` — se hereda el ámbito actual.

## Ejemplos

### Ejemplo #1 Sin límites

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "tarea 1"); // se inicia inmediatamente
$group->spawn(fn() => "tarea 2"); // se inicia inmediatamente
$group->spawn(fn() => "tarea 3"); // se inicia inmediatamente
```

### Ejemplo #2 Con límite de concurrencia

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "tarea 1"); // se inicia inmediatamente
$group->spawn(fn() => "tarea 2"); // se inicia inmediatamente
$group->spawn(fn() => "tarea 3"); // espera en la cola
```

## Ver también

- [TaskGroup::spawn](/es/docs/reference/task-group/spawn.html) — Agregar una tarea
- [Scope](/es/docs/components/scope.html) — Gestión del ciclo de vida de las corrutinas
