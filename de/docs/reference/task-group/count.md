---
layout: docs
lang: de
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /de/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Die Gesamtanzahl der Aufgaben in der Gruppe abrufen."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Gibt die Gesamtanzahl der Aufgaben in der Gruppe zurueck: in der Warteschlange, laufend und abgeschlossen.

TaskGroup implementiert das `Countable`-Interface, sodass Sie `count($group)` verwenden koennen.

## Rueckgabewert

Die Gesamtanzahl der Aufgaben (`int`).

## Beispiele

### Beispiel #1 Aufgaben zaehlen

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## Siehe auch

- [TaskGroup::isFinished](/de/docs/reference/task-group/is-finished.html) --- Pruefen, ob alle Aufgaben abgeschlossen sind
- [TaskGroup::isSealed](/de/docs/reference/task-group/is-sealed.html) --- Pruefen, ob die Gruppe versiegelt ist
