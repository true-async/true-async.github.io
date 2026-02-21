---
layout: docs
lang: de
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /de/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Ein Future erstellen, das mit einem Array aller Aufgabenergebnisse aufgeloest wird."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Gibt ein `Future` zurueck, das mit einem Array von Ergebnissen aufgeloest wird, wenn alle Aufgaben abgeschlossen sind.
Die Array-Schluessel entsprechen den ueber `spawn()` / `spawnWithKey()` zugewiesenen Schluesseln.

Wenn die Aufgaben bereits abgeschlossen sind, wird das `Future` sofort aufgeloest.

Das zurueckgegebene `Future` unterstuetzt ein Abbruch-Token ueber `await(?Completable $cancellation)`,
sodass Sie ein Timeout oder eine andere Abbruchstrategie festlegen koennen.

## Parameter

**ignoreErrors**
: Wenn `false` (Standard) und Fehler vorhanden sind, wird das `Future` mit `CompositeException` abgelehnt.
  Wenn `true`, werden Fehler ignoriert und das `Future` wird nur mit erfolgreichen Ergebnissen aufgeloest.
  Fehler koennen ueber `getErrors()` abgerufen werden.

## Rueckgabewert

`Async\Future` --- ein zukuenftiges Ergebnis, das das Array der Aufgabenergebnisse enthaelt.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

Das `Future` wird mit `Async\CompositeException` abgelehnt, wenn `$ignoreErrors = false` und mindestens eine Aufgabe mit einem Fehler fehlgeschlagen ist.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Beispiel #2 Fehlerbehandlung

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fehlgeschlagen"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fehlgeschlagen"
        }
    }
});
```

### Beispiel #3 Fehler ignorieren

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fehlgeschlagen"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Beispiel #4 Warten mit Timeout

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Daten konnten nicht innerhalb von 5 Sekunden abgerufen werden\n";
    }
});
```

## Siehe auch

- [TaskGroup::awaitCompletion](/de/docs/reference/task-group/await-completion.html) --- Auf Abschluss ohne Ausnahmen warten
- [TaskGroup::getResults](/de/docs/reference/task-group/get-results.html) --- Ergebnisse ohne Warten abrufen
- [TaskGroup::getErrors](/de/docs/reference/task-group/get-errors.html) --- Fehler abrufen
