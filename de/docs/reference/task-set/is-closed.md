---
layout: docs
lang: de
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "Prüfen, ob das Set geschlossen ist."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

Gibt `true` zurück, wenn das Set geschlossen ist (`close()` oder `cancel()` wurde aufgerufen).

## Rückgabewert

`true`, wenn das Set geschlossen ist. Andernfalls `false`.

## Beispiele

### Beispiel #1 Zustand prüfen

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "ja\n" : "nein\n"; // "nein"

    $set->close();
    echo $set->isClosed() ? "ja\n" : "nein\n"; // "ja"
});
```

## Siehe auch

- [TaskSet::close](/de/docs/reference/task-set/close.html) — Das Set schließen
- [TaskSet::isFinished](/de/docs/reference/task-set/is-finished.html) — Prüfen, ob die Tasks abgeschlossen sind
