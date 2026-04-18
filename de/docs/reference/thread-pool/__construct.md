---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Erstellt einen neuen ThreadPool mit einer festen Anzahl von Worker-Threads."
---

# ThreadPool::__construct()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Erstellt einen neuen Thread-Pool und startet alle Worker-Threads sofort. Die Worker bleiben für die gesamte Lebensdauer des Pools aktiv, wodurch der Thread-Startaufwand pro Aufgabe entfällt.

## Parameter

| Parameter    | Typ   | Beschreibung                                                                                              |
|--------------|-------|-----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Anzahl der zu erstellenden Worker-Threads. Muss ≥ 1 sein. Alle Threads starten zum Zeitpunkt der Erstellung. |
| `$queueSize` | `int` | Maximale Anzahl von Aufgaben, die in der Warteschlange warten können. `0` (Standard) bedeutet `$workers × 4`. Wenn die Warteschlange voll ist, wird die aufrufende Coroutine von `submit()` angehalten, bis ein Slot frei wird. |

## Ausnahmen

Wirft `\ValueError`, wenn `$workers < 1`.

## Beispiele

### Beispiel #1 Einfache Pool-Erstellung

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 Worker, Warteschlangengröße standardmäßig 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Beispiel #2 Explizite Warteschlangengröße

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 Worker, Warteschlange auf 64 ausstehende Aufgaben begrenzt
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... Aufgaben einreichen ...

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::submit()](/de/docs/reference/thread-pool/submit.html) — Aufgabe zum Pool hinzufügen
- [ThreadPool::close()](/de/docs/reference/thread-pool/close.html) — Geordnetes Herunterfahren
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
- [`spawn_thread()`](/de/docs/reference/spawn-thread.html) — Einmaliger Thread für eine einzelne Aufgabe
