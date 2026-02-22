---
layout: docs
lang: es
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /es/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Disponer del ámbito del grupo."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Llama a `dispose()` en el ámbito interno del grupo, lo que resulta en la cancelación de todas las corrutinas.

## Ver también

- [TaskGroup::cancel](/es/docs/reference/task-group/cancel.html) — Cancelar todas las tareas
- [Scope](/es/docs/components/scope.html) — Gestión del ciclo de vida de las corrutinas
