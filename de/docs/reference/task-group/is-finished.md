---
layout: docs
lang: de
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /de/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Pruefen, ob alle Aufgaben abgeschlossen sind."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Gibt `true` zurueck, wenn die Warteschlange leer ist und keine aktiven Coroutinen vorhanden sind.

Dieser Zustand kann voruebergehend sein: Wenn die Gruppe nicht versiegelt ist, koennen noch neue Aufgaben hinzugefuegt werden.

## Siehe auch

- [TaskGroup::isSealed](/de/docs/reference/task-group/is-sealed.html) --- Pruefen, ob die Gruppe versiegelt ist
- [TaskGroup::awaitCompletion](/de/docs/reference/task-group/await-completion.html) --- Auf Abschluss warten
