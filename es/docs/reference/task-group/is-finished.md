---
layout: docs
lang: es
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /es/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Verificar si todas las tareas han finalizado."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Devuelve `true` si la cola está vacía y no hay corrutinas activas.

Este estado puede ser temporal: si el grupo no está sellado, aún se pueden agregar nuevas tareas.

## Ver también

- [TaskGroup::isSealed](/es/docs/reference/task-group/is-sealed.html) — Verificar si el grupo está sellado
- [TaskGroup::awaitCompletion](/es/docs/reference/task-group/await-completion.html) — Esperar la finalización
