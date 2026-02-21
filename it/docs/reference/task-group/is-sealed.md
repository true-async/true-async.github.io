---
layout: docs
lang: it
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /it/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Verifica se il gruppo è sigillato."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Restituisce `true` dopo che `seal()` o `cancel()` è stato chiamato.

## Vedi anche

- [TaskGroup::seal](/it/docs/reference/task-group/seal.html) --- Sigilla il gruppo
- [TaskGroup::isFinished](/it/docs/reference/task-group/is-finished.html) --- Verifica se è terminato
