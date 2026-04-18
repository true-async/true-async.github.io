---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Wendet einen Callable auf jedes Array-Element parallel mit dem Thread-Pool an."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Reicht `$task($item)` für jedes Element von `$items` gleichzeitig an die Worker des Pools ein und blockiert dann die aufrufende Coroutine, bis alle Aufgaben abgeschlossen sind. Gibt die Ergebnisse in der gleichen Reihenfolge wie das Eingabe-Array zurück, unabhängig von der Reihenfolge, in der die Worker abschließen.

Wenn eine Aufgabe eine Ausnahme wirft, wirft `map()` diese in der aufrufenden Coroutine erneut. Andere laufende Aufgaben werden nicht abgebrochen.

## Parameter

| Parameter | Typ        | Beschreibung                                                                                              |
|-----------|------------|-----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | Die Eingabe-Elemente. Jedes Element wird als erstes Argument an `$task` übergeben.                        |
| `$task`   | `callable` | Der Callable, der auf jedes Element angewendet wird. Wird in einem Worker-Thread ausgeführt; es gelten dieselben Datenübertragungsregeln wie bei `submit()`. |

## Rückgabewert

`array` — Ergebnisse von `$task` für jedes Eingabe-Element, in der gleichen Reihenfolge wie `$items`.

## Ausnahmen

- `Async\ThreadPoolException` — wenn der Pool geschlossen wurde.
- Wirft die erste Ausnahme erneut, die von einer Aufgabe geworfen wurde.

## Beispiele

### Beispiel #1 Zeilen in mehreren Dateien parallel zählen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $files = ['/var/log/app.log', '/var/log/nginx.log', '/var/log/php.log'];

    $lineCounts = $pool->map($files, function(string $path) {
        if (!file_exists($path)) {
            return 0;
        }
        $count = 0;
        $fh = fopen($path, 'r');
        while (!feof($fh)) {
            fgets($fh);
            $count++;
        }
        fclose($fh);
        return $count;
    });

    foreach ($files as $i => $path) {
        echo "$path: {$lineCounts[$i]} Zeilen\n";
    }

    $pool->close();
});
```

### Beispiel #2 Parallele numerische Berechnungen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    $pool = new ThreadPool(workers: 4);

    $inputs = [1_000_000, 2_000_000, 3_000_000, 4_000_000];

    $results = $pool->map($inputs, function(int $n) {
        $sum = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    foreach ($inputs as $i => $n) {
        echo "$n Iterationen → {$results[$i]}\n";
    }

    $pool->close();
});
```

## Siehe auch

- [ThreadPool::submit()](/de/docs/reference/thread-pool/submit.html) — Einzelne Aufgabe einreichen und ein Future erhalten
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
