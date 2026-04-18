---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/submit.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/submit.html
page_title: "ThreadPool::submit()"
description: "Invia un task al pool di thread e ricevi un Future per il suo risultato."
---

# ThreadPool::submit()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::submit(callable $task, mixed ...$args): Async\Future
```

Aggiunge un task alla coda interna del pool. Un worker libero lo preleva, lo esegue e risolve il `Future` restituito con il valore di ritorno. Se la coda è piena, la coroutine chiamante viene sospesa fino a quando non si libera un posto.

## Parametri

| Parametro | Tipo       | Descrizione                                                                                                         |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------|
| `$task`   | `callable` | Il callable da eseguire in un thread worker. Viene copiato in profondità nel worker — le closure che catturano oggetti o risorse lanciano `Async\ThreadTransferException`. |
| `...$args`| `mixed`    | Argomenti aggiuntivi passati a `$task`. Anch'essi copiati in profondità.                                            |

## Valore restituito

`Async\Future` — si risolve con il valore di ritorno di `$task`, o viene rifiutato con qualsiasi eccezione lanciata da `$task`.

## Eccezioni

- `Async\ThreadPoolException` — lanciata immediatamente se il pool è stato chiuso tramite `close()` o `cancel()`.
- `Async\ThreadTransferException` — lanciata se `$task` o qualsiasi argomento non può essere serializzato per il trasferimento (es. `stdClass`, riferimenti PHP, risorse).

## Esempi

### Esempio #1 Submit e await di base

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

### Esempio #2 Gestione delle eccezioni da un task

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
        echo "Catturata: ", $e->getMessage(), "\n";
        // Catturata: something went wrong in the worker
    }

    $pool->close();
});
```

### Esempio #3 Invio di più task in parallelo

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

## Vedere anche

- [ThreadPool::map()](/it/docs/reference/thread-pool/map.html) — map parallelo su un array
- [ThreadPool::close()](/it/docs/reference/thread-pool/close.html) — arresto controllato
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente e regole di trasferimento dati
