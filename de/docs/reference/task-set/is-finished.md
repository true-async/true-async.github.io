---
layout: docs
lang: de
path_key: "/docs/reference/task-set/is-finished.html"
nav_active: docs
permalink: /de/docs/reference/task-set/is-finished.html
page_title: "TaskSet::isFinished"
description: "Prüfen, ob alle Tasks im Set abgeschlossen sind."
---

# TaskSet::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isFinished(): bool
```

Gibt `true` zurück, wenn keine aktiven Coroutinen vorhanden sind und die Task-Warteschlange leer ist.

Wenn das Set nicht versiegelt ist, kann dieser Zustand vorübergehend sein — neue Tasks
können über `spawn()` hinzugefügt werden.

## Rückgabewert

`true`, wenn alle Tasks abgeschlossen sind. Andernfalls `false`.

## Beispiele

### Beispiel #1 Zustand prüfen

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isFinished() ? "ja\n" : "nein\n"; // "ja"

    $set->spawn(fn() => "task");
    echo $set->isFinished() ? "ja\n" : "nein\n"; // "nein"

    $set->seal();
    $set->joinAll()->await();
    echo $set->isFinished() ? "ja\n" : "nein\n"; // "ja"
});
```

## Siehe auch

- [TaskSet::isSealed](/de/docs/reference/task-set/is-sealed.html) — Prüfen, ob das Set versiegelt ist
- [TaskSet::count](/de/docs/reference/task-set/count.html) — Anzahl der Tasks
