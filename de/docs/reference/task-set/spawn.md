---
layout: docs
lang: de
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /de/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Einen Task mit automatischem Schlüssel zum Set hinzufügen."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Fügt ein Callable mit einem automatisch inkrementierten Schlüssel (0, 1, 2, ...) zum Set hinzu.

Wenn kein Nebenläufigkeitslimit gesetzt ist oder ein Slot verfügbar ist, wird die Coroutine sofort erstellt.
Andernfalls wird das Callable mit seinen Argumenten in eine Warteschlange eingereiht und gestartet, sobald ein Slot frei wird.

## Parameter

**task**
: Auszuführendes Callable. Akzeptiert jedes Callable: Closure, Funktion, Methode.

**args**
: Argumente, die an das Callable übergeben werden.

## Fehler

Wirft `Async\AsyncException`, wenn das Set versiegelt (`seal()`) oder abgebrochen (`cancel()`) wurde.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "first");
    $set->spawn(fn() => "second");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Beispiel #2 Mit Argumenten

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## Siehe auch

- [TaskSet::spawnWithKey](/de/docs/reference/task-set/spawn-with-key.html) — Einen Task mit explizitem Schlüssel hinzufügen
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Auf alle Tasks warten
