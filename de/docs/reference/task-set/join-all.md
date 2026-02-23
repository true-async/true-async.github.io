---
layout: docs
lang: de
path_key: "/docs/reference/task-set/join-all.html"
nav_active: docs
permalink: /de/docs/reference/task-set/join-all.html
page_title: "TaskSet::joinAll"
description: "Auf alle Tasks warten und ein Ergebnis-Array mit automatischer Bereinigung des Sets erhalten."
---

# TaskSet::joinAll

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAll(bool $ignoreErrors = false): Async\Future
```

Gibt ein `Future` zurück, das mit einem Array von Ergebnissen aufgelöst wird, wenn alle Tasks abgeschlossen sind.
Die Array-Schlüssel entsprechen den Schlüsseln, die bei `spawn()` / `spawnWithKey()` vergeben wurden.

**Nach der Auslieferung der Ergebnisse werden alle Einträge automatisch aus dem Set entfernt**, und `count()` wird 0.

Wenn die Tasks bereits abgeschlossen sind, wird das `Future` sofort aufgelöst.

Das zurückgegebene `Future` unterstützt ein Cancellation-Token über `await(?Completable $cancellation)`.

## Parameter

**ignoreErrors**
: Wenn `false` (Standard) und Fehler vorliegen, wird das `Future` mit `CompositeException` abgelehnt.
  Wenn `true`, werden Fehler ignoriert und das `Future` wird nur mit den erfolgreichen Ergebnissen aufgelöst.

## Rückgabewert

`Async\Future` — ein zukünftiges Ergebnis, das ein Array der Task-Ergebnisse enthält.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

Das `Future` wird mit `Async\CompositeException` abgelehnt, wenn `$ignoreErrors = false` und mindestens ein Task mit einem Fehler abgeschlossen wurde.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('a', fn() => 10);
    $set->spawnWithKey('b', fn() => 20);
    $set->spawnWithKey('c', fn() => 30);

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)

    echo $set->count() . "\n"; // 0
});
```

### Beispiel #2 Fehlerbehandlung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    try {
        $set->joinAll()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Beispiel #3 Fehler ignorieren

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    $results = $set->joinAll(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1
});
```

### Beispiel #4 Warten mit Timeout

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());
    $set->seal();

    try {
        $results = $set->joinAll()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "Daten konnten nicht innerhalb von 5 Sekunden abgerufen werden\n";
    }
});
```

## Siehe auch

- [TaskSet::joinNext](/de/docs/reference/task-set/join-next.html) — Ergebnis des ersten abgeschlossenen Tasks
- [TaskSet::joinAny](/de/docs/reference/task-set/join-any.html) — Ergebnis des ersten erfolgreichen Tasks
- [TaskGroup::all](/de/docs/reference/task-group/all.html) — Entsprechung ohne automatische Bereinigung
