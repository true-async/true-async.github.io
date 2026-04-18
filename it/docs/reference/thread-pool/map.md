---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/map.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/map.html
page_title: "ThreadPool::map()"
description: "Applica un callable a ogni elemento dell'array in parallelo utilizzando il pool di thread."
---

# ThreadPool::map()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::map(array $items, callable $task): array
```

Invia `$task($item)` per ogni elemento di `$items` ai worker del pool in modo concorrente, poi blocca la coroutine chiamante fino al completamento di tutti i task. Restituisce i risultati nello stesso ordine dell'array di input, indipendentemente dall'ordine in cui i worker completano i task.

Se un qualsiasi task lancia un'eccezione, `map()` la rilancia nella coroutine chiamante. Gli altri task in volo non vengono cancellati.

## Parametri

| Parametro | Tipo       | Descrizione                                                                                              |
|-----------|------------|----------------------------------------------------------------------------------------------------------|
| `$items`  | `array`    | Gli elementi di input. Ogni elemento viene passato come primo argomento a `$task`.                       |
| `$task`   | `callable` | Il callable da applicare a ogni elemento. Eseguito in un thread worker; si applicano le stesse regole di trasferimento dati di `submit()`. |

## Valore restituito

`array` — risultati di `$task` per ogni elemento di input, nello stesso ordine di `$items`.

## Eccezioni

- `Async\ThreadPoolException` — se il pool è stato chiuso.
- Rilancia la prima eccezione lanciata da qualsiasi task.

## Esempi

### Esempio #1 Contare le righe in più file in parallelo

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
        echo "$path: {$lineCounts[$i]} righe\n";
    }

    $pool->close();
});
```

### Esempio #2 Calcolo numerico in parallelo

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
        echo "$n iterazioni → {$results[$i]}\n";
    }

    $pool->close();
});
```

## Vedere anche

- [ThreadPool::submit()](/it/docs/reference/thread-pool/submit.html) — inviare un singolo task e ottenere un Future
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
