---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/get-worker-count.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/get-worker-count.html
page_title: "ThreadPool::getWorkerCount()"
description: "Gibt die Anzahl der Worker-Threads im Thread-Pool zurück."
---

# ThreadPool::getWorkerCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getWorkerCount(): int
```

Gibt die Anzahl der Worker-Threads im Pool zurück. Dieser Wert wird zum Zeitpunkt der Erstellung festgelegt und ändert sich während der Lebensdauer des Pools nicht. Er entspricht dem `$workers`-Argument, das an [`new ThreadPool()`](/de/docs/reference/thread-pool/__construct.html) übergeben wurde.

## Rückgabewert

`int` — Anzahl der Worker-Threads (wie im Konstruktor festgelegt).

## Beispiele

### Beispiel #1 Worker-Anzahl bestätigen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    echo $pool->getWorkerCount(), "\n"; // 4

    $pool->close();
});
```

### Beispiel #2 Pool an verfügbare CPU-Kerne anpassen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $cores = (int) shell_exec('nproc') ?: 4;
    $pool  = new ThreadPool(workers: $cores);

    echo "Pool erstellt mit ", $pool->getWorkerCount(), " Workern\n";

    $futures = [];
    for ($i = 0; $i < $cores * 2; $i++) {
        $futures[] = $pool->submit(fn() => 'done');
    }
    foreach ($futures as $f) {
        await($f);
    }

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::getPendingCount()](/de/docs/reference/thread-pool/get-pending-count.html) — Aufgaben in der Warteschlange
- [ThreadPool::getRunningCount()](/de/docs/reference/thread-pool/get-running-count.html) — Aktuell ausgeführte Aufgaben
- [ThreadPool::getCompletedCount()](/de/docs/reference/thread-pool/get-completed-count.html) — Insgesamt abgeschlossene Aufgaben
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
