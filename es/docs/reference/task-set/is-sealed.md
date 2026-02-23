---
layout: docs
lang: es
path_key: "/docs/reference/task-set/is-sealed.html"
nav_active: docs
permalink: /es/docs/reference/task-set/is-sealed.html
page_title: "TaskSet::isSealed"
description: "Comprobar si el conjunto está sellado."
---

# TaskSet::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isSealed(): bool
```

Devuelve `true` si el conjunto está sellado (se llamó a `seal()` o `cancel()`).

## Valor de retorno

`true` si el conjunto está sellado. `false` en caso contrario.

## Ejemplos

### Ejemplo #1 Comprobación de estado

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isSealed() ? "yes\n" : "no\n"; // "no"

    $set->seal();
    echo $set->isSealed() ? "yes\n" : "no\n"; // "yes"
});
```

## Ver también

- [TaskSet::seal](/es/docs/reference/task-set/seal.html) — Sellar el conjunto
- [TaskSet::isFinished](/es/docs/reference/task-set/is-finished.html) — Comprobar si las tareas han finalizado
