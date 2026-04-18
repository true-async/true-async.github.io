---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/get-pending-count.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/get-pending-count.html
page_title: "ThreadPool::getPendingCount()"
description: "Gibt die Anzahl der Aufgaben zurück, die in der Warteschlange des Thread-Pools warten."
---

# ThreadPool::getPendingCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getPendingCount(): int
```

Gibt die Anzahl der Aufgaben zurück, die eingereicht wurden, aber noch nicht von einem Worker-Thread aufgenommen wurden. Dieser Zähler wird durch eine atomare Variable gesichert und ist zu jedem Zeitpunkt genau, auch wenn Worker parallel laufen.

## Rückgabewert

`int` — Anzahl der Aufgaben, die aktuell in der Warteschlange warten.

## Beispiele

### Beispiel #1 Entleerung der Warteschlange beobachten

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // Worker starten lassen

    echo "ausstehend: ", $pool->getPendingCount(), "\n"; // ausstehend: 4

    foreach ($futures as $f) {
        await($f);
    }

    echo "ausstehend: ", $pool->getPendingCount(), "\n"; // ausstehend: 0

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::getRunningCount()](/de/docs/reference/thread-pool/get-running-count.html) — Aktuell ausgeführte Aufgaben
- [ThreadPool::getCompletedCount()](/de/docs/reference/thread-pool/get-completed-count.html) — Insgesamt abgeschlossene Aufgaben
- [ThreadPool::getWorkerCount()](/de/docs/reference/thread-pool/get-worker-count.html) — Anzahl der Worker
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
