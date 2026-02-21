---
layout: docs
lang: de
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /de/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Einen Iterator erhalten, um Ergebnisse bei Abschluss der Aufgaben zu durchlaufen."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Gibt einen Iterator zurueck, der Ergebnisse **bei Abschluss der Aufgaben** liefert.
TaskGroup implementiert `IteratorAggregate`, sodass Sie `foreach` direkt verwenden koennen.

## Verhalten des Iterators

- `foreach` suspendiert die aktuelle Coroutine, bis das naechste Ergebnis verfuegbar ist
- Der Schluessel ist derselbe wie ueber `spawn()` oder `spawnWithKey()` zugewiesen
- Der Wert ist ein Array `[mixed $result, ?Throwable $error]`:
  - Erfolg: `[$result, null]`
  - Fehler: `[null, $error]`
- Die Iteration endet, wenn die Gruppe versiegelt ist **und** alle Aufgaben verarbeitet wurden
- Wenn die Gruppe nicht versiegelt ist, suspendiert `foreach` und wartet auf neue Aufgaben

> **Wichtig:** Ohne Aufruf von `seal()` wartet die Iteration unbegrenzt.

## Beispiele

### Beispiel #1 Ergebnisse verarbeiten, sobald sie bereit sind

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Aufgabe $key fehlgeschlagen: {$error->getMessage()}\n";
            continue;
        }
        echo "Aufgabe $key erledigt\n";
    }
});
```

### Beispiel #2 Iteration mit benannten Schluesseln

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: " . count($result) . " Datensaetze empfangen\n";
        }
    }
});
```

## Siehe auch

- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) --- Die Gruppe versiegeln
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
- [TaskGroup::getResults](/de/docs/reference/task-group/get-results.html) --- Ein Array von Ergebnissen abrufen
