---
layout: docs
lang: es
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /es/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Verificar si el grupo está sellado."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Devuelve `true` después de que se haya llamado a `seal()` o `cancel()`.

## Ver también

- [TaskGroup::seal](/es/docs/reference/task-group/seal.html) — Sellar el grupo
- [TaskGroup::isFinished](/es/docs/reference/task-group/is-finished.html) — Verificar si ha finalizado
