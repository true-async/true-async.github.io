---
layout: docs
lang: fr
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /fr/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Acquérir une ressource du pool avec attente."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Acquiert une ressource du pool. Si aucune ressource libre n'est disponible et que la limite maximale
a été atteinte, la coroutine se bloque jusqu'à ce qu'une ressource devienne disponible.

Si le pool dispose d'une ressource libre, elle est retournée immédiatement. S'il n'y a pas de ressources libres
mais que la limite `max` n'a pas été atteinte, une nouvelle ressource est créée via `factory`. Sinon,
l'appel attend qu'une ressource soit libérée.

## Paramètres

**timeout**
: Temps d'attente maximum en millisecondes.
  `0` --- attente indéfinie.
  Si le timeout est dépassé, une `PoolException` est levée.

## Valeur de retour

Retourne une ressource du pool.

## Erreurs

Lève `Async\PoolException` si :
- Le délai d'attente est dépassé.
- Le pool est fermé.

## Exemples

### Exemple #1 Utilisation basique

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Get a connection (waits if necessary)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Exemple #2 Avec timeout

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // wait no more than 5 seconds
    // work with connection...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## Voir aussi

- [Pool::tryAcquire](/fr/docs/reference/pool/try-acquire.html) --- Acquisition non bloquante de ressource
- [Pool::release](/fr/docs/reference/pool/release.html) --- Libérer une ressource dans le pool
- [Pool::__construct](/fr/docs/reference/pool/construct.html) --- Créer un pool
