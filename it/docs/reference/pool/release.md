---
layout: docs
lang: it
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /it/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Rilascia una risorsa al pool."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Restituisce una risorsa precedentemente acquisita al pool. Se un hook `beforeRelease`
e' stato impostato durante la creazione del pool, viene chiamato prima della restituzione. Se l'hook
restituisce `false`, la risorsa viene distrutta anziche' essere restituita al pool.

Se ci sono coroutine in attesa di una risorsa tramite `acquire()`, la risorsa viene
immediatamente consegnata alla prima coroutine in attesa.

## Parametri

**resource**
: Una risorsa precedentemente acquisita tramite `acquire()` o `tryAcquire()`.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Restituzione sicura tramite finally

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### Esempio #2 Distruzione automatica tramite beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // Se la connessione e' interrotta — non restituire al pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // Se isAlive() restituisce false, il client verra' distrutto
    $pool->release($client);
}
```

## Vedi anche

- [Pool::acquire](/it/docs/reference/pool/acquire.html) --- Acquisisce una risorsa dal pool
- [Pool::tryAcquire](/it/docs/reference/pool/try-acquire.html) --- Acquisizione non bloccante
- [Pool::close](/it/docs/reference/pool/close.html) --- Chiude il pool
