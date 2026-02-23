---
layout: docs
lang: de
path_key: "/docs/reference/task-set/spawn-with-key.html"
nav_active: docs
permalink: /de/docs/reference/task-set/spawn-with-key.html
page_title: "TaskSet::spawnWithKey"
description: "Einen Task mit explizitem Schlüssel zum Set hinzufügen."
---

# TaskSet::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Fügt ein Callable mit einem angegebenen Schlüssel zum Set hinzu. Der Schlüssel wird im Ergebnis-Array
und bei der Iteration über `foreach` verwendet.

## Parameter

**key**
: Ergebnisschlüssel. Muss innerhalb des Sets eindeutig sein.

**task**
: Auszuführendes Callable.

**args**
: Argumente, die an das Callable übergeben werden.

## Fehler

- Wirft `Async\AsyncException`, wenn das Set versiegelt oder abgebrochen wurde.
- Wirft `Async\AsyncException`, wenn der Schlüssel bereits in Verwendung ist.

## Beispiele

### Beispiel #1 Benannte Tasks

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('user',   fn() => fetchUser($id));
    $set->spawnWithKey('orders', fn() => fetchOrders($id));

    $set->seal();
    $data = $set->joinAll()->await();

    echo $data['user']['name'];
    echo count($data['orders']);
});
```

## Siehe auch

- [TaskSet::spawn](/de/docs/reference/task-set/spawn.html) — Einen Task mit automatischem Schlüssel hinzufügen
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Auf alle Tasks warten
