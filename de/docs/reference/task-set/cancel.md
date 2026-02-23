---
layout: docs
lang: de
path_key: "/docs/reference/task-set/cancel.html"
nav_active: docs
permalink: /de/docs/reference/task-set/cancel.html
page_title: "TaskSet::cancel"
description: "Alle Tasks im Set abbrechen."
---

# TaskSet::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Bricht alle laufenden Coroutinen ab und leert die Task-Warteschlange.
Ruft implizit `seal()` auf.

## Parameter

**cancellation**
: Abbruchgrund. Wenn `null`, wird eine Standard-`AsyncCancellation` erstellt.

## Beispiele

### Beispiel #1 Bedingter Abbruch

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask1());
    $set->spawn(fn() => longRunningTask2());

    // Alle Tasks abbrechen
    $set->cancel();

    echo $set->isSealed() ? "versiegelt\n" : "nein\n"; // "versiegelt"
});
```

## Siehe auch

- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set versiegeln
- [TaskSet::dispose](/de/docs/reference/task-set/dispose.html) — Den Scope des Sets zerstören
