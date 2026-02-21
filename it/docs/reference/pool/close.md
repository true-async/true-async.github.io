---
layout: docs
lang: it
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /it/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Chiude il pool e distrugge tutte le risorse."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Chiude il pool di risorse. Tutte le risorse inattive vengono distrutte tramite il `destructor`
(se ne e' stato fornito uno). Tutte le coroutine in attesa di una risorsa tramite `acquire()` ricevono
una `PoolException`. Dopo la chiusura, qualsiasi chiamata a `acquire()` e `tryAcquire()`
lancia un'eccezione.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Arresto controllato

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Chiudi tutti i prepared statement e la connessione
    },
    min: 2,
    max: 10
);

// ... lavora con il pool ...

// Chiudi il pool quando l'applicazione si arresta
$pool->close();
```

### Esempio #2 Le coroutine in attesa ricevono un'eccezione

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // ha preso l'unica risorsa

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // in attesa del rilascio
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // la coroutine in attesa ricevera' PoolException
```

## Vedi anche

- [Pool::isClosed](/it/docs/reference/pool/is-closed.html) --- Verifica se il pool e' chiuso
- [Pool::__construct](/it/docs/reference/pool/construct.html) --- Crea un pool
