---
layout: docs
lang: it
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Verifica se il gruppo è sigillato."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Restituisce `true` dopo che `close()` o `cancel()` è stato chiamato.

## Vedi anche

- [TaskGroup::close](/it/docs/reference/task-group/close.html) --- Sigilla il gruppo
- [TaskGroup::isFinished](/it/docs/reference/task-group/is-finished.html) --- Verifica se è terminato
