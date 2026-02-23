---
layout: docs
lang: de
path_key: "/docs/reference/task-set/finally.html"
nav_active: docs
permalink: /de/docs/reference/task-set/finally.html
page_title: "TaskSet::finally"
description: "Einen Abschluss-Handler für das Set registrieren."
---

# TaskSet::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::finally(Closure $callback): void
```

Registriert einen Callback, der aufgerufen wird, wenn das Set versiegelt ist und alle Tasks abgeschlossen sind.
Der Callback erhält das TaskSet als Parameter.

Da `cancel()` implizit `seal()` aufruft, wird der Handler auch bei einem Abbruch ausgelöst.

Wenn das Set bereits abgeschlossen ist, wird der Callback sofort synchron aufgerufen.

## Parameter

**callback**
: Closure, die `TaskSet` als einziges Argument akzeptiert.

## Beispiele

### Beispiel #1 Abschluss protokollieren

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->finally(function(TaskSet $s) {
        echo "Set abgeschlossen\n";
    });

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");

    $set->seal();
    $set->joinAll()->await();
});
// Ausgabe:
// Set abgeschlossen
```

### Beispiel #2 Aufruf bei einem bereits abgeschlossenen Set

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();
    $set->spawn(fn() => 1);
    $set->seal();
    $set->joinAll()->await();

    // Set ist bereits abgeschlossen — Callback wird synchron aufgerufen
    $set->finally(function(TaskSet $s) {
        echo "sofort aufgerufen\n";
    });

    echo "nach finally\n";
});
// Ausgabe:
// sofort aufgerufen
// nach finally
```

## Siehe auch

- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set versiegeln
- [TaskSet::awaitCompletion](/de/docs/reference/task-set/await-completion.html) — Auf den Abschluss warten
