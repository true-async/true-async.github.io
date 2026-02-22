---
layout: docs
lang: fr
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /fr/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Verifier si le groupe est scelle."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Retourne `true` apres que `seal()` ou `cancel()` a ete appele.

## Voir aussi

- [TaskGroup::seal](/fr/docs/reference/task-group/seal.html) --- Sceller le groupe
- [TaskGroup::isFinished](/fr/docs/reference/task-group/is-finished.html) --- Verifier si termine
