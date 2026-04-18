---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Reicht eine Aufgabe beim Thread-Pool ein und erhält ein Future für das Ergebnis."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Fügt eine Aufgabe in die interne Warteschlange des Pools ein. Ein freier Worker nimmt sie auf, führt sie aus und löst das zurückgegebene `Future` mit dem Rückgabewert auf. Wenn die Warteschlange voll ist, wird die aufrufende Coroutine angehalten, bis ein Slot frei wird.

## Parameter

| Parameter | Typ        | Beschreibung                                                                                                         |
|-----------|------------|----------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | Der Callable, der in einem Worker-Thread ausgeführt werden soll. Wird tief in den Worker kopiert — Closures, die Objekte oder Ressourcen erfassen, werfen `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Zusätzliche Argumente, die an `$task` übergeben werden. Werden ebenfalls tief kopiert.                               |

## Rückgabewert

`Async\Future` — wird mit dem Rückgabewert von `$task` aufgelöst oder mit jeder von `$task` geworfenen Ausnahme abgelehnt.

## Ausnahmen

- `Async\ThreadPoolException` — wird sofort geworfen, wenn der Pool über `close()` oder `cancel()` geschlossen wurde.
- `Async\ThreadTransferException` — wird geworfen, wenn `$task` oder ein Argument nicht für die Übertragung serialisiert werden kann (z. B. `stdClass`, PHP-Referenzen, Ressourcen).

## Beispiele

### Beispiel #1 Einfaches Submit und Await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function(int $n) {
        $sum = 0;
        for ($i = 0; $i < $n; $i++) {
            $sum += $i;
        }
        return $sum;
    }, 1_000_000);

    echo await($future), "\n"; // 499999500000

    $pool->close();
});
```

### Beispiel #2 Ausnahmen einer Aufgabe behandeln

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(function() {
        throw new \RuntimeException('something went wrong in the worker');
    });

    try {
        await($future);
    } catch (\RuntimeException $e) {
        echo "Abgefangen: ", $e->getMessage(), "\n";
        // Abgefangen: something went wrong in the worker
    }

    $pool->close();
});
```

### Beispiel #3 Mehrere Aufgaben parallel einreichen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $futures = [];
    for ($i = 1; $i <= 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            return $i * $i;
        });
    }

    foreach ($futures as $f) {
        echo await($f), "\n";
    }

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::map()](/de/docs/reference/thread-pool/map.html) — Paralleles Map über ein Array
- [ThreadPool::close()](/de/docs/reference/thread-pool/close.html) — Geordnetes Herunterfahren
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht und Datenübertragungsregeln
