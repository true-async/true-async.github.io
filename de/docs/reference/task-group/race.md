---
layout: docs
lang: de
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /de/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Ein Future erstellen, das mit dem Ergebnis der ersten abgeschlossenen Aufgabe aufgeloest wird."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Gibt ein `Future` zurueck, das mit dem Ergebnis der ersten abgeschlossenen Aufgabe aufgeloest wird --- ob erfolgreich oder fehlgeschlagen.
Wenn die Aufgabe mit einem Fehler fehlgeschlagen ist, wird das `Future` mit dieser Ausnahme abgelehnt.
Die verbleibenden Aufgaben **laufen weiter**.

Wenn bereits eine abgeschlossene Aufgabe existiert, wird das `Future` sofort aufgeloest.

Das zurueckgegebene `Future` unterstuetzt ein Abbruch-Token ueber `await(?Completable $cancellation)`.

## Rueckgabewert

`Async\Future` --- ein zukuenftiges Ergebnis der ersten abgeschlossenen Aufgabe.
Rufen Sie `->await()` auf, um den Wert zu erhalten.

## Fehler

- Wirft `Async\AsyncException`, wenn die Gruppe leer ist.
- Das `Future` wird mit der Ausnahme der Aufgabe abgelehnt, wenn die erste abgeschlossene Aufgabe mit einem Fehler fehlgeschlagen ist.

## Beispiele

### Beispiel #1 Erste Antwort

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "langsam"; });
    $group->spawn(fn() => "schnell");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "schnell"
});
```

### Beispiel #2 Hedged Requests mit Timeout

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Keine Replik hat innerhalb von 2 Sekunden geantwortet\n";
    }
});
```

## Siehe auch

- [TaskGroup::any](/de/docs/reference/task-group/any.html) --- Erstes erfolgreiches Ergebnis
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Alle Ergebnisse
