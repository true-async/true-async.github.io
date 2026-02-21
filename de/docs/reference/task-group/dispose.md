---
layout: docs
lang: de
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /de/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Den Gruppen-Scope freigeben."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Ruft `dispose()` auf dem internen Scope der Gruppe auf, was zum Abbruch aller Coroutinen fuehrt.

## Siehe auch

- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) --- Alle Aufgaben abbrechen
- [Scope](/de/docs/components/scope.html) --- Verwaltung des Coroutine-Lebenszyklus
