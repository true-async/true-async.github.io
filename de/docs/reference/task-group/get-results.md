---
layout: docs
lang: de
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /de/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Ein Array von Ergebnissen abgeschlossener Aufgaben abrufen."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Gibt ein Array von Ergebnissen erfolgreich abgeschlossener Aufgaben zurueck.
Die Array-Schluessel entsprechen den ueber `spawn()` (Auto-Inkrement) oder `spawnWithKey()` (benutzerdefiniert) zugewiesenen Schluesseln.

Die Methode wartet nicht auf den Abschluss der Aufgaben --- sie gibt nur die zum Zeitpunkt des Aufrufs verfuegbaren Ergebnisse zurueck.

## Rueckgabewert

Ein `array<int|string, mixed>`, wobei der Schluessel der Aufgabenbezeichner und der Wert das Ausfuehrungsergebnis ist.

## Beispiele

### Beispiel #1 Ergebnisse nach all() abrufen

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Beispiel #2 Ergebnisse enthalten keine Fehler

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fehlgeschlagen"); });
    $group->spawn(fn() => "auch ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "auch ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fehlgeschlagen")]

    $group->suppressErrors();
});
```

## Siehe auch

- [TaskGroup::getErrors](/de/docs/reference/task-group/get-errors.html) --- Ein Array von Fehlern abrufen
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
- [TaskGroup::suppressErrors](/de/docs/reference/task-group/suppress-errors.html) --- Fehler als behandelt markieren
