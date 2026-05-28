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
public ThreadPool::__construct(
    int $workers = 0,
    int $queueSize = 0,
    ?\Closure $bootloader = null,
    bool $coroutine = false,
    int $concurrency = 0,
)
```

Erstellt einen neuen Thread-Pool und startet alle Worker-Threads sofort. Die Worker bleiben für die
gesamte Lebensdauer des Pools aktiv, wodurch der Thread-Startaufwand pro Aufgabe entfällt.

## Parameter

| Parameter      | Typ          | Beschreibung                                                                                                                                                                                                                                                          |
|----------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`        | Anzahl der Worker-Threads. `0` (Default) — Autodetect über [`Async\available_parallelism()`](/de/docs/reference/available-parallelism.html).                                                                                                                            |
| `$queueSize`   | `int`        | Maximale Länge der ausstehenden Aufgaben-Warteschlange. `0` (Default) — `workers × 4`. Ist die Warteschlange voll, suspendiert `submit()` die aufrufende Coroutine, bis ein Slot frei wird.                                                                            |
| `$bootloader`  | `?\Closure`  | Worker-Startup-Initialisierung. Die Closure wird einmal deep-copiert und in jedem Worker **vor** dem eigentlichen Task-Loop ausgeführt. Praktisch für Autoload, Connection-Pool-Warmup, Opcache-Precompilation. Wirft der Bootloader eine Exception, gilt der gesamte Pool als nicht gestartet. |
| `$coroutine`   | `bool`       | Bei `true` läuft jeder Task **als Coroutine** in einem eigenen Child-Scope, eingebettet in den gemeinsamen Pool-Scope des Workers. Innerhalb des Tasks dürfen `await`, Channels, IO und `spawn` verwendet werden — alles, ohne den OS-Thread zu blockieren.                              |
| `$concurrency` | `int`        | Limit gleichzeitig lebender Coroutinen innerhalb eines Workers. Nur bei `coroutine: true` wirksam. `0` (Default) — unbegrenzt.                                                                                                                                          |

## Ausnahmen

Wirft `\ValueError`, wenn `$workers < 0` oder `$queueSize < 0`.

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

### Beispiel #3 Bootloader — Worker-Initialisierung

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function () {
    $pool = new ThreadPool(
        workers: 4,
        bootloader: function () {
            require __DIR__ . '/vendor/autoload.php';
            App\Container::boot();
            App\Database::warmupPool(min: 4, max: 16);
        },
    );

    // ... übermittelte Tasks sehen ein vollständig initialisiertes Environment ...

    $pool->close();
});
```

### Beispiel #4 Coroutine-Mode — innerhalb des Tasks dürfen Sie `await` nutzen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // Ein regulärer blockierender Aufruf parkt die Coroutine korrekt
        // und blockiert nicht den OS-Thread des Workers
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Beispiel #5 Autodetect der Worker-Zahl anhand der verfügbaren CPUs

```php
<?php

use Async\ThreadPool;

// workers: 0 (Default) → Async\available_parallelism()
$pool = new ThreadPool();   // berücksichtigt cgroup-Quota / Affinity des Containers
```

## Siehe auch

- [ThreadPool::submit()](/de/docs/reference/thread-pool/submit.html) — Aufgabe zum Pool hinzufügen
- [ThreadPool::close()](/de/docs/reference/thread-pool/close.html) — Geordnetes Herunterfahren
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
- [`spawn_thread()`](/de/docs/reference/spawn-thread.html) — Einmaliger Thread für eine einzelne Aufgabe
