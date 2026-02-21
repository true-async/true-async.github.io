---
layout: docs
lang: de
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /de/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Pruefen, ob die Gruppe versiegelt ist."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Gibt `true` zurueck, nachdem `seal()` oder `cancel()` aufgerufen wurde.

## Siehe auch

- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) --- Die Gruppe versiegeln
- [TaskGroup::isFinished](/de/docs/reference/task-group/is-finished.html) --- Pruefen, ob abgeschlossen
