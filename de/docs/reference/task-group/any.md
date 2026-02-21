---
layout: docs
lang: de
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /de/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Ein Future erstellen, das mit dem Ergebnis der ersten erfolgreichen Aufgabe aufgeloest wird."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Gibt ein `Future` zurueck, das mit dem Ergebnis der ersten *erfolgreich* abgeschlossenen Aufgabe aufgeloest wird.
Aufgaben, die mit einem Fehler fehlgeschlagen sind, werden uebersprungen.
Die verbleibenden Aufgaben **laufen weiter**.

Wenn alle Aufgaben mit Fehlern fehlschlagen, wird das `Future` mit `CompositeException` abgelehnt.

Das zurueckgegebene `Future` unterstuetzt ein Abbruch-Token ueber `await(?Completable $cancellation)`.

## Rueckgabewert

`Async\Future` --- ein zukuenftiges Ergebnis der ersten erfolgreichen Aufgabe.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

- Wirft `Async\AsyncException`, wenn die Gruppe leer ist.
- Das `Future` wird mit `Async\CompositeException` abgelehnt, wenn alle Aufgaben mit Fehlern fehlschlagen.

## Beispiele

### Beispiel #1 Erste erfolgreiche

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("Fehler 1"));
    $group->spawn(fn() => throw new \RuntimeException("Fehler 2"));
    $group->spawn(fn() => "Erfolg!");

    $result = $group->any()->await();
    echo $result . "\n"; // "Erfolg!"

    // Fehler fehlgeschlagener Aufgaben muessen explizit unterdrueckt werden
    $group->suppressErrors();
});
```

### Beispiel #2 Alle fehlgeschlagen

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("Fehler 1"));
    $group->spawn(fn() => throw new \RuntimeException("Fehler 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " Fehler\n"; // "2 Fehler"
    }
});
```

### Beispiel #3 Resiliente Suche mit Timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Kein Anbieter hat innerhalb von 3 Sekunden geantwortet\n";
    }

    $group->suppressErrors();
});
```

## Siehe auch

- [TaskGroup::race](/de/docs/reference/task-group/race.html) --- Erste abgeschlossene (Erfolg oder Fehler)
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Alle Ergebnisse
