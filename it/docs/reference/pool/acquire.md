---
layout: docs
lang: it
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /it/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Acquisisce una risorsa dal pool con attesa."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Acquisisce una risorsa dal pool. Se non sono disponibili risorse libere e il limite
massimo e' stato raggiunto, la coroutine si blocca fino a quando una risorsa diventa disponibile.

Se il pool ha una risorsa libera, viene restituita immediatamente. Se non ci sono risorse libere
ma il limite `max` non e' stato raggiunto, viene creata una nuova risorsa tramite `factory`. Altrimenti,
la chiamata attende il rilascio di una risorsa.

## Parametri

**timeout**
: Tempo massimo di attesa in millisecondi.
  `0` --- attesa indefinita.
  Se il timeout viene superato, viene lanciata una `PoolException`.

## Valore di ritorno

Restituisce una risorsa dal pool.

## Errori

Lancia `Async\PoolException` se:
- Il timeout di attesa viene superato.
- Il pool e' chiuso.

## Esempi

### Esempio #1 Utilizzo base

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Ottieni una connessione (attende se necessario)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Esempio #2 Con timeout

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // attendi al massimo 5 secondi
    // lavora con la connessione...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## Vedi anche

- [Pool::tryAcquire](/it/docs/reference/pool/try-acquire.html) --- Acquisizione non bloccante della risorsa
- [Pool::release](/it/docs/reference/pool/release.html) --- Rilascia una risorsa al pool
- [Pool::__construct](/it/docs/reference/pool/construct.html) --- Crea un pool
