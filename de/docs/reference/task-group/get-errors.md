---
layout: docs
lang: de
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /de/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Ein Array von Fehlern fehlgeschlagener Aufgaben abrufen."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Gibt ein Array von Ausnahmen (`Throwable`) von Aufgaben zurueck, die mit einem Fehler fehlgeschlagen sind.
Die Array-Schluessel entsprechen den Aufgabenschluesseln aus `spawn()` oder `spawnWithKey()`.

Die Methode wartet nicht auf den Abschluss der Aufgaben --- sie gibt nur die zum Zeitpunkt des Aufrufs verfuegbaren Fehler zurueck.

## Rueckgabewert

Ein `array<int|string, Throwable>`, wobei der Schluessel der Aufgabenbezeichner und der Wert die Ausnahme ist.

## Beispiele

### Beispiel #1 Fehler anzeigen

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Verbindungs-Timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Verbindungs-Timeout

    $group->suppressErrors();
});
```

## Unbehandelte Fehler

Wenn beim Zerstoeren einer TaskGroup unbehandelte Fehler verbleiben, signalisiert der Destruktor dies.
Fehler gelten als behandelt, wenn:

- `all()` mit `ignoreErrors: false` (Standard) aufgerufen wird und eine `CompositeException` wirft
- `suppressErrors()` aufgerufen wird
- Fehler durch den Iterator (`foreach`) behandelt werden

## Siehe auch

- [TaskGroup::getResults](/de/docs/reference/task-group/get-results.html) --- Ein Array von Ergebnissen abrufen
- [TaskGroup::suppressErrors](/de/docs/reference/task-group/suppress-errors.html) --- Fehler als behandelt markieren
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
