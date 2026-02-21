---
layout: docs
lang: it
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /it/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Acquisizione non bloccante di una risorsa dal pool."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Tenta di acquisire una risorsa dal pool senza bloccare. Se una risorsa libera
e' disponibile o il limite `max` non e' stato raggiunto, restituisce la risorsa immediatamente.
Altrimenti, restituisce `null`.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Restituisce una risorsa dal pool oppure `null` se non sono disponibili risorse libere
e il limite massimo e' stato raggiunto.

## Esempi

### Esempio #1 Tentativo di acquisizione di una risorsa

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "All connections are busy, try again later\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Orders: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Esempio #2 Fallback quando il pool non e' disponibile

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Cache non disponibile — interroga direttamente il database
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## Vedi anche

- [Pool::acquire](/it/docs/reference/pool/acquire.html) --- Acquisizione bloccante della risorsa
- [Pool::release](/it/docs/reference/pool/release.html) --- Rilascia una risorsa al pool
