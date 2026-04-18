---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Stoppt den Thread-Pool sofort und lehnt alle wartenden Aufgaben ab."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Leitet ein erzwungenes Herunterfahren des Pools ein. Nachdem `cancel()` aufgerufen wurde:

- Jeder nachfolgende `submit()`-Aufruf wirft sofort `Async\ThreadPoolException`.
- Aufgaben, die in der Warteschlange warten (noch nicht von einem Worker aufgenommen), werden **sofort abgelehnt** — ihre entsprechenden `Future`-Objekte wechseln in den abgelehnten Zustand mit einer `ThreadPoolException`.
- Aufgaben, die bereits in Worker-Threads ausgeführt werden, laufen bis zum Abschluss der aktuellen Aufgabe (ein gewaltsames Unterbrechen von PHP-Code innerhalb eines Threads ist nicht möglich).
- Worker stoppen, sobald sie die aktuelle Aufgabe abgeschlossen haben, und nehmen keine neuen Aufgaben aus der Warteschlange an.

Für ein geordnetes Herunterfahren, bei dem alle wartenden Aufgaben abgeschlossen werden, verwenden Sie stattdessen [`close()`](/de/docs/reference/thread-pool/close.html).

## Rückgabewert

`void`

## Beispiele

### Beispiel #1 Hartes Abbrechen mit Aufgaben in der Warteschlange

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Warteschlange mit 8 Aufgaben auf 2 Worker verteilen
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Sofort abbrechen — Aufgaben in der Warteschlange werden abgelehnt
    $pool->cancel();

    $done = 0;
    $cancelled = 0;
    foreach ($futures as $f) {
        try {
            await($f);
            $done++;
        } catch (ThreadPoolException $e) {
            $cancelled++;
        }
    }

    echo "done:      $done\n";      // 2  (liefen bereits, als cancel() aufgerufen wurde)
    echo "cancelled: $cancelled\n"; // 6  (waren noch in der Warteschlange)
});
```

## Siehe auch

- [ThreadPool::close()](/de/docs/reference/thread-pool/close.html) — Geordnetes Herunterfahren
- [ThreadPool::isClosed()](/de/docs/reference/thread-pool/is-closed.html) — Prüfen, ob der Pool geschlossen ist
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht und Vergleich close() vs cancel()
