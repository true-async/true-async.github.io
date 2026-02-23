---
layout: docs
lang: de
path_key: "/docs/reference/task-set/is-sealed.html"
nav_active: docs
permalink: /de/docs/reference/task-set/is-sealed.html
page_title: "TaskSet::isSealed"
description: "Prüfen, ob das Set versiegelt ist."
---

# TaskSet::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isSealed(): bool
```

Gibt `true` zurück, wenn das Set versiegelt ist (`seal()` oder `cancel()` wurde aufgerufen).

## Rückgabewert

`true`, wenn das Set versiegelt ist. Andernfalls `false`.

## Beispiele

### Beispiel #1 Zustand prüfen

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isSealed() ? "ja\n" : "nein\n"; // "nein"

    $set->seal();
    echo $set->isSealed() ? "ja\n" : "nein\n"; // "ja"
});
```

## Siehe auch

- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set versiegeln
- [TaskSet::isFinished](/de/docs/reference/task-set/is-finished.html) — Prüfen, ob die Tasks abgeschlossen sind
