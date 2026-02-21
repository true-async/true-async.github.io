---
layout: docs
lang: it
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /it/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Verifica se tutti i task sono terminati."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Restituisce `true` se la coda è vuota e non ci sono coroutine attive.

Questo stato può essere temporaneo: se il gruppo non è sigillato, nuovi task possono ancora essere aggiunti.

## Vedi anche

- [TaskGroup::isSealed](/it/docs/reference/task-group/is-sealed.html) --- Verifica se il gruppo è sigillato
- [TaskGroup::awaitCompletion](/it/docs/reference/task-group/await-completion.html) --- Attende il completamento
