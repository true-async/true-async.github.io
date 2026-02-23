---
layout: docs
lang: de
path_key: "/docs/reference/task-set/dispose.html"
nav_active: docs
permalink: /de/docs/reference/task-set/dispose.html
page_title: "TaskSet::dispose"
description: "Den Scope des Task-Sets zerstören."
---

# TaskSet::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::dispose(): void
```

Zerstört den Scope des Sets und bricht dabei alle Coroutinen ab. Nach diesem Aufruf ist das Set vollständig unbrauchbar.

## Beispiele

### Beispiel #1 Ein Set zerstören

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask());
    $set->dispose();
});
```

## Siehe auch

- [TaskSet::cancel](/de/docs/reference/task-set/cancel.html) — Tasks abbrechen
- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set versiegeln
