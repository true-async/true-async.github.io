---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/__construct.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/__construct.html
page_title: "ThreadPool::__construct()"
description: "Crea un nuovo ThreadPool con un numero fisso di thread worker."
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

Crea un nuovo pool di thread e avvia immediatamente tutti i thread worker. I worker restano attivi
per tutta la durata del pool, eliminando il costo di avvio del thread per ogni task.

## Parametri

| Parametro      | Tipo          | Descrizione                                                                                                       |
|----------------|---------------|-------------------------------------------------------------------------------------------------------------------|
| `$workers`     | `int`         | Numero di thread worker. `0` (default): autodetect tramite [`Async\available_parallelism()`](/it/docs/reference/available-parallelism.html). |
| `$queueSize`   | `int`         | Lunghezza massima della coda di task in attesa. `0` (default): `workers × 4`. Quando la coda è piena, `submit()` sospende la coroutine chiamante finché non si libera uno slot. |
| `$bootloader`  | `?\Closure`   | Inizializzazione di startup del worker. La closure viene deep-copiata una volta ed eseguita in ogni worker **prima** del ciclo principale di gestione dei task. Comodo per autoload, riscaldamento dei pool di connessioni, precompilazione di opcache. Se il bootloader lancia un'eccezione, l'intero pool viene considerato non riuscito. |
| `$coroutine`   | `bool`        | Se `true`, ogni task viene avviato **come coroutine** nel proprio scope figlio, annidato nello scope comune del pool del worker. All'interno del task si possono usare `await`, channel, IO e `spawn`, tutto senza bloccare il thread OS. |
| `$concurrency` | `int`         | Limite di coroutine vive contemporaneamente in un singolo worker. Usato solo con `coroutine: true`. `0` (default): nessun limite. |

## Eccezioni

Lancia `\ValueError` se `$workers < 0` o `$queueSize < 0`.

## Esempi

### Esempio #1 Creazione di base del pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 thread worker, dimensione coda predefinita pari a 16
    $pool = new ThreadPool(workers: 4);

    $future = $pool->submit(fn() => 'hello from worker');
    echo await($future), "\n"; // hello from worker

    $pool->close();
});
```

### Esempio #2 Dimensione coda esplicita

```php
<?php

use Async\ThreadPool;
use function Async\spawn;

spawn(function() {
    // 4 thread worker, coda limitata a 64 task
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... invio dei task ...

    $pool->close();
});
```

### Esempio #3 Bootloader: inizializzazione di startup del worker

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

    // ... i task submit vedranno un ambiente completamente inizializzato ...

    $pool->close();
});
```

### Esempio #4 Modalità coroutine: dentro al task si può fare await

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function () {
    $pool = new ThreadPool(workers: 4, coroutine: true);

    $future = $pool->submit(function () {
        // una normale chiamata bloccante parcheggia correttamente la coroutine,
        // invece di bloccare il thread OS del worker
        $pdo  = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
        $rows = $pdo->query('SELECT * FROM users LIMIT 10')->fetchAll();
        return $rows;
    });

    print_r(await($future));
    $pool->close();
});
```

### Esempio #5 Autodetect del numero di worker dalle CPU disponibili

```php
<?php

use Async\ThreadPool;

// workers: 0 (default) → Async\available_parallelism()
$pool = new ThreadPool();   // tiene conto delle quote cgroup del container / affinity
```

## Vedere anche

- [ThreadPool::submit()](/it/docs/reference/thread-pool/submit.html) — aggiungere un task al pool
- [ThreadPool::close()](/it/docs/reference/thread-pool/close.html) — arresto controllato
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
- [`spawn_thread()`](/it/docs/reference/spawn-thread.html) — thread separato per un singolo task
