---
layout: docs
lang: es
path_key: "/docs/reference/task-set/dispose.html"
nav_active: docs
permalink: /es/docs/reference/task-set/dispose.html
page_title: "TaskSet::dispose"
description: "Destruir el scope del conjunto de tareas."
---

# TaskSet::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::dispose(): void
```

Destruye el scope del conjunto, cancelando todas las coroutines. Después de llamar a este método, el conjunto queda completamente inutilizable.

## Ejemplos

### Ejemplo #1 Destruir un conjunto

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask());
    $set->dispose();
});
```

## Ver también

- [TaskSet::cancel](/es/docs/reference/task-set/cancel.html) — Cancelar tareas
- [TaskSet::seal](/es/docs/reference/task-set/seal.html) — Sellar el conjunto
