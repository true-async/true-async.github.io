---
layout: docs
lang: de
path_key: "/docs/reference/task-set/count.html"
nav_active: docs
permalink: /de/docs/reference/task-set/count.html
page_title: "TaskSet::count"
description: "Die Anzahl der noch nicht an den Konsumenten ausgelieferten Tasks abrufen."
---

# TaskSet::count

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::count(): int
```

Gibt die Anzahl der Tasks zurück, die noch nicht an den Konsumenten ausgeliefert wurden.

Im Gegensatz zu `TaskGroup::count()`, das die Gesamtanzahl der Tasks zurückgibt,
verringert sich `TaskSet::count()` mit jeder Ergebnisauslieferung über
`joinNext()`, `joinAny()`, `joinAll()` oder `foreach`.

`TaskSet` implementiert `Countable`, sodass `count($set)` verwendet werden kann.

## Rückgabewert

Die Anzahl der Tasks im Set.

## Beispiele

### Beispiel #1 Fortschritt verfolgen

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");
    $set->spawn(fn() => "c");

    echo $set->count() . "\n"; // 3

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 2

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 1

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 0
});
```

## Siehe auch

- [TaskSet::isFinished](/de/docs/reference/task-set/is-finished.html) — Prüfen, ob alle Tasks abgeschlossen sind
- [TaskSet::joinNext](/de/docs/reference/task-set/join-next.html) — Das nächste Ergebnis abrufen
