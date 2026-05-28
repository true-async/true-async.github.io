---
layout: docs
lang: de
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /de/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "Das Set für neue Tasks versiegeln."
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
```

Versiegelt das Set. Danach werfen `spawn()` und `spawnWithKey()` eine Exception.
Bereits laufende Coroutinen und Tasks in der Warteschlange arbeiten weiter.

Wiederholte Aufrufe sind ein Noop.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "task");
    $set->close();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Siehe auch

- [TaskSet::cancel](/de/docs/reference/task-set/cancel.html) — Alle Tasks abbrechen (ruft implizit seal auf)
- [TaskSet::isClosed](/de/docs/reference/task-set/is-closed.html) — Prüfen, ob das Set versiegelt ist
