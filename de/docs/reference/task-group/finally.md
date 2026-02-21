---
layout: docs
lang: de
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /de/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Einen Abschluss-Handler fuer die Gruppe registrieren."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Registriert einen Callback, der aufgerufen wird, wenn die Gruppe versiegelt ist und alle Aufgaben abgeschlossen sind.
Der Callback erhaelt die TaskGroup als Parameter.

Da `cancel()` implizit `seal()` aufruft, wird der Handler auch bei einem Abbruch ausgeloest.

Wenn die Gruppe bereits abgeschlossen ist, wird der Callback sofort synchron aufgerufen.

## Parameter

**callback**
: Eine Closure, die `TaskGroup` als einziges Argument nimmt.

## Beispiele

### Beispiel #1 Abschluss protokollieren

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Abgeschlossen: " . $g->count() . " Aufgaben\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Ausgabe:
// Abgeschlossen: 2 Aufgaben
```

### Beispiel #2 Aufruf bei einer bereits abgeschlossenen Gruppe

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Gruppe ist bereits abgeschlossen — Callback wird synchron aufgerufen
    $group->finally(function(TaskGroup $g) {
        echo "sofort aufgerufen\n";
    });

    echo "nach finally\n";
});
// Ausgabe:
// sofort aufgerufen
// nach finally
```

## Siehe auch

- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) --- Die Gruppe versiegeln
- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) --- Aufgaben abbrechen
