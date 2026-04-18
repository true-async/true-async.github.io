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
public ThreadPool::__construct(int $workers, int $queueSize = 0)
```

Crea un nuovo pool di thread e avvia immediatamente tutti i thread worker. I worker rimangono attivi per tutta la durata del pool, eliminando il costo di avvio del thread per ogni task.

## Parametri

| Parametro    | Tipo  | Descrizione                                                                                              |
|--------------|-------|----------------------------------------------------------------------------------------------------------|
| `$workers`   | `int` | Numero di thread worker da creare. Deve essere ≥ 1. Tutti i thread vengono avviati al momento della costruzione. |
| `$queueSize` | `int` | Numero massimo di task che possono attendere in coda. `0` (default) significa `$workers × 4`. Quando la coda è piena, `submit()` sospende la coroutine chiamante fino a quando non si libera un posto. |

## Eccezioni

Lancia `\ValueError` se `$workers < 1`.

## Esempi

### Esempio #1 Creazione base del pool

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    // 4 worker, dimensione coda predefinita pari a 16
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
    // 4 worker, coda limitata a 64 task in attesa
    $pool = new ThreadPool(workers: 4, queueSize: 64);

    // ... invio dei task ...

    $pool->close();
});
```

## Vedere anche

- [ThreadPool::submit()](/it/docs/reference/thread-pool/submit.html) — aggiungere un task al pool
- [ThreadPool::close()](/it/docs/reference/thread-pool/close.html) — arresto controllato
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
- [`spawn_thread()`](/it/docs/reference/spawn-thread.html) — thread singolo per un unico task
