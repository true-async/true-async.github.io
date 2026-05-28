---
layout: docs
lang: es
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "Comprobar si el conjunto está sellado."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

Devuelve `true` si el conjunto está sellado (se llamó a `close()` o `cancel()`).

## Valor de retorno

`true` si el conjunto está sellado. `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Comprobación de estado

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "yes\n" : "no\n"; // "no"

    $set->close();
    echo $set->isClosed() ? "yes\n" : "no\n"; // "yes"
});
```

## Ver también

- [TaskSet::close](/es/docs/reference/task-set/close.html) — Sellar el conjunto
- [TaskSet::isFinished](/es/docs/reference/task-set/is-finished.html) — Comprobar si las tareas han finalizado
