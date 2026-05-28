---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Verifier si le groupe est scelle."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Retourne `true` apres que `close()` ou `cancel()` a ete appele.

## Voir aussi

- [TaskGroup::close](/fr/docs/reference/task-group/close.html) --- Fermer le groupe
- [TaskGroup::isFinished](/fr/docs/reference/task-group/is-finished.html) --- Verifier si termine
