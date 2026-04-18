---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/get-running-count.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/get-running-count.html
page_title: "ThreadPool::getRunningCount()"
description: "Gibt die Anzahl der Aufgaben zurück, die aktuell in Worker-Threads ausgeführt werden."
---

# ThreadPool::getRunningCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getRunningCount(): int
```

Gibt die Anzahl der Aufgaben zurück, die derzeit von einem Worker-Thread ausgeführt werden (d. h. aus der Warteschlange entnommen und noch nicht abgeschlossen). Der Maximalwert ist durch die Anzahl der Worker begrenzt. Dieser Zähler wird durch eine atomare Variable gesichert und ist zu jedem Zeitpunkt genau.

## Rückgabewert

`int` — Anzahl der Aufgaben, die aktuell auf allen Worker-Threads ausgeführt werden.

## Beispiele

### Beispiel #1 Laufenden Zähler während der Aufgabenausführung beobachten

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;
use function Async\delay;

spawn(function() {
    $pool = new ThreadPool(workers: 3);

    $futures = [];
    for ($i = 0; $i < 6; $i++) {
        $futures[] = $pool->submit(function() {
            $t = microtime(true);
            while (microtime(true) - $t < 0.1) {}
            return 'done';
        });
    }

    delay(10); // Worker Zeit zum Starten geben

    echo "worker:  ", $pool->getWorkerCount(), "\n";  // worker:  3
    echo "laufend: ", $pool->getRunningCount(), "\n"; // laufend: 3

    foreach ($futures as $f) {
        await($f);
    }

    echo "laufend: ", $pool->getRunningCount(), "\n"; // laufend: 0

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::getPendingCount()](/de/docs/reference/thread-pool/get-pending-count.html) — Aufgaben in der Warteschlange
- [ThreadPool::getCompletedCount()](/de/docs/reference/thread-pool/get-completed-count.html) — Insgesamt abgeschlossene Aufgaben
- [ThreadPool::getWorkerCount()](/de/docs/reference/thread-pool/get-worker-count.html) — Anzahl der Worker
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
