---
layout: docs
lang: es
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /es/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Verificar si el grupo está cerrado."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Devuelve `true` después de que se haya llamado a `close()` o `cancel()`.

## Ver también

- [TaskGroup::close](/es/docs/reference/task-group/close.html) — Cerrar el grupo
- [TaskGroup::isFinished](/es/docs/reference/task-group/is-finished.html) — Verificar si ha finalizado
