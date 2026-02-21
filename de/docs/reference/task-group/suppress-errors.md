---
layout: docs
lang: de
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /de/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Alle aktuellen Fehler als behandelt markieren."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Markiert alle aktuellen Fehler in der Gruppe als behandelt.

Wenn eine TaskGroup zerstoert wird, prueft sie auf unbehandelte Fehler. Wenn Fehler nicht behandelt wurden
(ueber `all()`, `foreach` oder `suppressErrors()`), signalisiert der Destruktor verlorene Fehler.
Der Aufruf von `suppressErrors()` ist eine explizite Bestaetigung, dass die Fehler behandelt wurden.

## Beispiele

### Beispiel #1 Fehler nach selektiver Behandlung unterdruecken

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("Fehler 1"); });
    $group->spawn(function() { throw new \LogicException("Fehler 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Fehler manuell behandeln
    foreach ($group->getErrors() as $key => $error) {
        log_error("Aufgabe $key: {$error->getMessage()}");
    }

    // Fehler als behandelt markieren
    $group->suppressErrors();
});
```

## Siehe auch

- [TaskGroup::getErrors](/de/docs/reference/task-group/get-errors.html) --- Ein Array von Fehlern abrufen
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
