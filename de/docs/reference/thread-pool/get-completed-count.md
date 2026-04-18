---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/get-completed-count.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/get-completed-count.html
page_title: "ThreadPool::getCompletedCount()"
description: "Gibt die Gesamtzahl der seit der Erstellung des Thread-Pools abgeschlossenen Aufgaben zurück."
---

# ThreadPool::getCompletedCount()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::getCompletedCount(): int
```

Gibt die Gesamtzahl der Aufgaben zurück, die seit der Erstellung des Pools von einem Worker vollständig ausgeführt wurden (erfolgreich oder mit einer Ausnahme). Dieser Zähler ist monoton steigend und wird niemals zurückgesetzt. Er wird durch eine atomare Variable gesichert und ist zu jedem Zeitpunkt genau.

Eine Aufgabe gilt als abgeschlossen, wenn der Worker die Ausführung beendet — unabhängig davon, ob sie einen Wert zurückgegeben oder eine Ausnahme geworfen hat.

## Rückgabewert

`int` — Gesamtanzahl der abgeschlossenen Aufgaben seit der Pool-Erstellung.

## Beispiele

### Beispiel #1 Durchsatz verfolgen

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

    delay(10);
    echo "bisher abgeschlossen: ", $pool->getCompletedCount(), "\n"; // 0 oder mehr

    foreach ($futures as $f) {
        await($f);
    }

    echo "insgesamt abgeschlossen: ", $pool->getCompletedCount(), "\n"; // 6

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::getPendingCount()](/de/docs/reference/thread-pool/get-pending-count.html) — Aufgaben in der Warteschlange
- [ThreadPool::getRunningCount()](/de/docs/reference/thread-pool/get-running-count.html) — Aktuell ausgeführte Aufgaben
- [ThreadPool::getWorkerCount()](/de/docs/reference/thread-pool/get-worker-count.html) — Anzahl der Worker
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
