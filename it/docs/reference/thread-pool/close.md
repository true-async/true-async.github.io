---
layout: docs
lang: it
path_key: "/docs/reference/thread-pool/close.html"
nav_active: docs
permalink: /it/docs/reference/thread-pool/close.html
page_title: "ThreadPool::close()"
description: "Arresta il pool di thread in modo controllato, attendendo il completamento di tutti i task in coda e in esecuzione."
---

# ThreadPool::close()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::close(): void
```

Avvia un arresto controllato del pool. Dopo la chiamata a `close()`:

- Qualsiasi successiva chiamata a `submit()` lancia immediatamente `Async\ThreadPoolException`.
- I task già presenti in coda continuano e vengono completati normalmente.
- I task attualmente in esecuzione nei thread worker vengono completati normalmente.
- Il metodo blocca la coroutine chiamante fino al completamento di tutti i task in corso e all'arresto di tutti i worker.

Per un arresto immediato e forzato che scarta i task in coda, usare [`cancel()`](/it/docs/reference/thread-pool/cancel.html).

## Valore restituito

`void`

## Esempi

### Esempio #1 Arresto controllato dopo l'invio di tutti i task

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

    $pool->close(); // attende il completamento del task precedente

    echo await($future), "\n"; // finished

    $pool->close();
});
```

### Esempio #2 L'invio dopo close() genera un'eccezione

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
        echo "Errore: ", $e->getMessage(), "\n";
        // Errore: Cannot submit task: thread pool is closed
    }
});
```

## Vedere anche

- [ThreadPool::cancel()](/it/docs/reference/thread-pool/cancel.html) — arresto forzato
- [ThreadPool::isClosed()](/it/docs/reference/thread-pool/is-closed.html) — verificare se il pool è chiuso
- [Async\ThreadPool](/it/docs/components/thread-pool.html) — panoramica del componente
