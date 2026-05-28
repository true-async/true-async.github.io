---
layout: docs
lang: de
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /de/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Die Gruppe schließen, um neue Aufgaben zu verhindern."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

Geschlossen die Gruppe. Jeder Versuch, `spawn()` oder `spawnWithKey()` zu verwenden, wirft eine Ausnahme.
Bereits laufende Coroutinen und Aufgaben in der Warteschlange werden weiter ausgefuehrt.

Wiederholte Aufrufe sind ein No-Op.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "Aufgabe");
    $group->close();

    try {
        $group->spawn(fn() => "weitere Aufgabe");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Siehe auch

- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) --- Alle Aufgaben abbrechen (ruft implizit close auf)
- [TaskGroup::isClosed](/de/docs/reference/task-group/is-closed.html) --- Pruefen, ob die Gruppe geschlossen ist
