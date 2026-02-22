---
layout: docs
lang: fr
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /fr/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Acquisition non bloquante d'une ressource du pool."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Tente d'acquérir une ressource du pool sans bloquer. Si une ressource libre
est disponible ou si la limite `max` n'a pas été atteinte, retourne la ressource immédiatement.
Sinon, retourne `null`.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Retourne une ressource du pool ou `null` si aucune ressource libre n'est disponible
et que la limite maximale a été atteinte.

## Exemples

### Exemple #1 Tentative d'acquisition d'une ressource

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

### Exemple #2 Solution de repli lorsque le pool est indisponible

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
        // Cache unavailable — query database directly
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## Voir aussi

- [Pool::acquire](/fr/docs/reference/pool/acquire.html) --- Acquisition bloquante de ressource
- [Pool::release](/fr/docs/reference/pool/release.html) --- Libérer une ressource dans le pool
