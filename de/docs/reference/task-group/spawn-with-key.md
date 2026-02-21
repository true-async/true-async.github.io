---
layout: docs
lang: de
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /de/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Eine Aufgabe mit explizitem Schluessel zur Gruppe hinzufuegen."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Fuegt ein Callable mit dem angegebenen Schluessel zur Gruppe hinzu.
Das Aufgabenergebnis ist ueber diesen Schluessel in `all()`, `getResults()` und bei der Iteration zugaenglich.

## Parameter

**key**
: Der Aufgabenschluessel. Ein String oder Integer. Duplikate sind nicht erlaubt.

**task**
: Das auszufuehrende Callable.

**args**
: Argumente, die an das Callable uebergeben werden.

## Fehler

Wirft `Async\AsyncException`, wenn die Gruppe versiegelt ist oder der Schluessel bereits existiert.

## Beispiele

### Beispiel #1 Benannte Aufgaben

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## Siehe auch

- [TaskGroup::spawn](/de/docs/reference/task-group/spawn.html) --- Eine Aufgabe mit automatisch inkrementiertem Schluessel hinzufuegen
- [TaskGroup::all](/de/docs/reference/task-group/all.html) --- Auf alle Aufgaben warten
