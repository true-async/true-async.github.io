---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/cancel.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/cancel.html
page_title: "ThreadPool::cancel()"
description: "Arresta forzatamente il pool di thread, rifiutando immediatamente tutti i task in coda."
---

# ThreadPool::cancel()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::cancel(): void
```

Avvia un arresto forzato del pool. Dopo la chiamata a `cancel()`:

- Qualsiasi successiva chiamata a `submit()` lancia immediatamente `Async\ThreadPoolException`.
- I task in attesa nella coda (non ancora presi da un worker) vengono **immediatamente rifiutati** — i corrispondenti oggetti `Future` transitano allo stato rifiutato con una `ThreadPoolException`.
- I task già in esecuzione nei thread worker vengono portati a completamento del task corrente (interrompere forzatamente il codice PHP all'interno di un thread non è possibile).
- I worker si fermano non appena terminano il task corrente e non prendono altri task dalla coda.

Per un arresto controllato che lascia completare tutti i task in coda, usare [`close()`](/it/docs/reference/thread-pool/close.html).

## Valore restituito

`void`

## Esempi

### Esempio #1 Cancellazione forzata con task in coda

```php
<?php

use Async\ThreadPool;
use Async\ThreadPoolException;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2, queueSize: 10);

    // Riempire la coda con 8 task su 2 worker
    $futures = [];
    for ($i = 0; $i < 8; $i++) {
        $futures[] = $pool->submit(function() use ($i) {
            $t = microtime(true);
            while (microtime(true) - $t < 0.2) {}
            return $i;
        });
    }

    // Cancellazione immediata — i task in coda vengono rifiutati
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

    echo "completati:  $done\n";      // 2  (già in esecuzione quando cancel() è stato chiamato)
    echo "cancellati: $cancelled\n"; // 6  (erano ancora in coda)
});
```

## Vedere anche

- [ThreadPool::close()](/it/docs/reference/thread-pool/close.html) — arresto controllato
- [ThreadPool::isClosed()](/it/docs/reference/thread-pool/is-closed.html) — verificare se il pool è chiuso
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente e confronto close() vs cancel()
