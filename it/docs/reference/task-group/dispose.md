---
layout: docs
lang: it
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /it/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Elimina lo scope del gruppo."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Chiama `dispose()` sullo scope interno del gruppo, il che comporta la cancellazione di tutte le coroutine.

## Vedi anche

- [TaskGroup::cancel](/it/docs/reference/task-group/cancel.html) --- Cancella tutti i task
- [Scope](/it/docs/components/scope.html) --- Gestione del ciclo di vita delle coroutine
