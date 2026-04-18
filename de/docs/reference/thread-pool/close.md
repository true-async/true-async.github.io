---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Fährt den Thread-Pool geordnet herunter und wartet, bis alle wartenden und laufenden Aufgaben abgeschlossen sind."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Leitet ein geordnetes Herunterfahren des Pools ein. Nachdem `close()` aufgerufen wurde:

- Jeder nachfolgende `submit()`-Aufruf wirft sofort `Async\ThreadPoolException`.
- Aufgaben, die sich bereits in der Warteschlange befinden, werden normal fortgesetzt und abgeschlossen.
- Aufgaben, die derzeit in Worker-Threads ausgeführt werden, werden normal abgeschlossen.
- Die Methode blockiert die aufrufende Coroutine, bis alle laufenden Aufgaben abgeschlossen und alle Worker gestoppt sind.

Für ein sofortiges, hartes Herunterfahren, bei dem Aufgaben in der Warteschlange verworfen werden, verwenden Sie stattdessen [`cancel()`](/de/docs/reference/thread-pool/cancel.html).

## Rückgabewert

`void`

## Beispiele

### Beispiel #1 Geordnetes Herunterfahren nach dem Einreichen aller Aufgaben

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        return 'finished';
    });

    $pool->close(); // wartet auf den Abschluss der obigen Aufgabe

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Beispiel #2 Submit nach close wirft eine Ausnahme

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    $pool->close();

    try {
        $pool->submit(fn() => 'too late');
    } catch (ThreadPoolException $e) {
        echo "Fehler: ", $e->getMessage(), "\n";
        // Error: Cannot submit task: thread pool is closed
    }
});
```

## Siehe auch

- [ThreadPool::cancel()](/de/docs/reference/thread-pool/cancel.html) — Hartes/erzwungenes Herunterfahren
- [ThreadPool::isClosed()](/de/docs/reference/thread-pool/is-closed.html) — Prüfen, ob der Pool geschlossen ist
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
