---
layout: docs
lang: de
path_key: "/docs/reference/task-set/get-iterator.html"
nav_active: docs
permalink: /de/docs/reference/task-set/get-iterator.html
page_title: "TaskSet::getIterator"
description: "Einen Iterator zum Durchlaufen der Ergebnisse mit automatischer Bereinigung erhalten."
---

# TaskSet::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::getIterator(): Iterator
```

Gibt einen Iterator zurück, der Ergebnisse liefert, **sobald Tasks abgeschlossen werden**.
TaskSet implementiert `IteratorAggregate`, sodass `foreach` direkt verwendet werden kann.

**Jeder verarbeitete Eintrag wird automatisch aus dem Set entfernt**, wodurch Speicher
freigegeben und `count()` verringert wird.

## Iterator-Verhalten

- `foreach` suspendiert die aktuelle Coroutine, bis das nächste Ergebnis verfügbar ist
- Der Schlüssel entspricht dem bei `spawn()` oder `spawnWithKey()` zugewiesenen Schlüssel
- Der Wert ist ein Array `[mixed $result, ?Throwable $error]`:
  - Erfolg: `[$result, null]`
  - Fehler: `[null, $error]`
- Die Iteration endet, wenn das Set versiegelt ist **und** alle Tasks verarbeitet wurden
- Wenn das Set nicht versiegelt ist, wartet `foreach` auf neue Tasks

> **Wichtig:** Ohne Aufruf von `seal()` wartet die Iteration unbegrenzt.

## Beispiele

### Beispiel #1 Stream-Verarbeitung

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    for ($i = 0; $i < 100; $i++) {
        $set->spawn(fn() => processItem($items[$i]));
    }
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key: Fehler — {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key: fertig\n";
        // Eintrag entfernt, Speicher freigegeben
    }

    echo $set->count() . "\n"; // 0
});
```

### Beispiel #2 Benannte Schlüssel

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('users', fn() => fetchUsers());
    $set->spawnWithKey('orders', fn() => fetchOrders());
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: " . count($result) . " Datensätze empfangen\n";
        }
    }
});
```

## Siehe auch

- [TaskSet::seal](/de/docs/reference/task-set/seal.html) — Das Set versiegeln
- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Auf alle Tasks warten
- [TaskSet::joinNext](/de/docs/reference/task-set/join-next.html) — Nächstes Ergebnis
