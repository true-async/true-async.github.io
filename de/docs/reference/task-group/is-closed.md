---
layout: docs
lang: de
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Pruefen, ob die Gruppe geschlossen ist."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Gibt `true` zurueck, nachdem `close()` oder `cancel()` aufgerufen wurde.

## Siehe auch

- [TaskGroup::close](/de/docs/reference/task-group/close.html) --- Die Gruppe schließen
- [TaskGroup::isFinished](/de/docs/reference/task-group/is-finished.html) --- Pruefen, ob abgeschlossen
