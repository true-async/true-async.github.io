---
layout: docs
lang: de
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /de/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Eine Aufgabe mit automatisch inkrementiertem Schluessel zur Gruppe hinzufuegen."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Fuegt ein Callable mit einem automatisch inkrementierten Schluessel (0, 1, 2, ...) zur Gruppe hinzu.

Wenn kein Parallelitaetslimit gesetzt ist oder ein Platz verfuegbar ist, wird die Coroutine sofort erstellt.
Andernfalls wird das Callable mit seinen Argumenten in eine Warteschlange gestellt und gestartet, sobald ein Platz frei wird.

## Parameter

**task**
: Das auszufuehrende Callable. Akzeptiert jedes Callable: Closure, Funktion, Methode.

**args**
: Argumente, die an das Callable uebergeben werden.

## Fehler

Wirft `Async\AsyncException`, wenn die Gruppe versiegelt (`seal()`) oder abgebrochen (`cancel()`) ist.

## Beispiele

### Beispiel #1 Grundlegende Verwendung

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "erste");
    $group->spawn(fn() => "zweite");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "erste"
    var_dump($results[1]); // string(6) "zweite"
});
```

### Beispiel #2 Mit Argumenten

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## Siehe auch

- [TaskGroup::spawnWithKey](/de/docs/reference/task-group/spawn-with-key.html) --- Eine Aufgabe mit explizitem Schluessel hinzufuegen
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
