---
layout: docs
lang: de
path_key: "/docs/reference/task-set/await-completion.html"
nav_active: docs
permalink: /de/docs/reference/task-set/await-completion.html
page_title: "TaskSet::awaitCompletion"
description: "Auf den Abschluss aller Tasks im Set warten."
---

# TaskSet::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::awaitCompletion(): void
```

Suspendiert die aktuelle Coroutine, bis alle Tasks im Set abgeschlossen sind.

Das Set **muss** vor dem Aufruf dieser Methode versiegelt sein.

Im Gegensatz zu `joinAll()` wirft diese Methode keine Exceptions bei Task-Fehlern
und gibt keine Ergebnisse zurück.

## Fehler

Wirft `Async\AsyncException`, wenn das Set nicht versiegelt ist.

## Beispiele

### Beispiel #1 Auf Abschluss warten

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => processFile("a.txt"));
    $set->spawn(fn() => processFile("b.txt"));
    $set->spawn(fn() => throw new \RuntimeException("error"));

    $set->seal();
    $set->awaitCompletion(); // Wirft nicht, auch wenn Tasks fehlgeschlagen sind

    echo "Alle Tasks abgeschlossen\n";
});
```

## Siehe auch

- [TaskSet::joinAll](/de/docs/reference/task-set/join-all.html) — Warten und Ergebnisse abrufen
- [TaskSet::finally](/de/docs/reference/task-set/finally.html) — Abschluss-Handler
