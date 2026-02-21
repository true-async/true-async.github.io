---
layout: docs
lang: de
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /de/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Die Gruppe versiegeln, um neue Aufgaben zu verhindern."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

Versiegelt die Gruppe. Jeder Versuch, `spawn()` oder `spawnWithKey()` zu verwenden, wirft eine Ausnahme.
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
    $group->seal();

    try {
        $group->spawn(fn() => "weitere Aufgabe");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Siehe auch

- [TaskGroup::cancel](/de/docs/reference/task-group/cancel.html) --- Alle Aufgaben abbrechen (ruft implizit seal auf)
- [TaskGroup::isSealed](/de/docs/reference/task-group/is-sealed.html) --- Pruefen, ob die Gruppe versiegelt ist
