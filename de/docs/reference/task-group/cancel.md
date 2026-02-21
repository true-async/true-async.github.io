---
layout: docs
lang: de
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /de/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "Alle Aufgaben in der Gruppe abbrechen."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Bricht alle laufenden Coroutinen und Aufgaben in der Warteschlange ab.
Ruft implizit `seal()` auf. Aufgaben in der Warteschlange werden nie gestartet.

Coroutinen erhalten eine `AsyncCancellation` und werden beendet.
Der Abbruch erfolgt asynchron --- verwenden Sie `awaitCompletion()`, um den Abschluss zu garantieren.

## Parameter

**cancellation**
: Die Ausnahme, die als Abbruchgrund dient. Wenn `null`, wird eine Standard-`AsyncCancellation` mit der Nachricht "TaskGroup cancelled" verwendet.

## Beispiele

### Beispiel #1 Abbruch mit Warten auf Abschluss

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "lange Aufgabe";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "Alle Aufgaben abgebrochen\n";
});
```

### Beispiel #2 Abbruch mit Begruendung

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("Timeout ueberschritten"));
    $group->awaitCompletion();
});
```

## Siehe auch

- [TaskGroup::seal](/de/docs/reference/task-group/seal.html) --- Versiegeln ohne Abbruch
- [TaskGroup::awaitCompletion](/de/docs/reference/task-group/await-completion.html) --- Auf Abschluss warten
- [TaskGroup::dispose](/de/docs/reference/task-group/dispose.html) --- Den Gruppen-Scope freigeben
