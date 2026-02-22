---
layout: docs
lang: fr
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /fr/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Libérer une ressource dans le pool."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Retourne une ressource précédemment acquise dans le pool. Si un hook `beforeRelease`
a été défini lors de la création du pool, il est appelé avant le retour. Si le hook
retourne `false`, la ressource est détruite au lieu d'être retournée dans le pool.

Si des coroutines attendent une ressource via `acquire()`, la ressource est
immédiatement transmise à la première coroutine en attente.

## Paramètres

**resource**
: Une ressource précédemment acquise via `acquire()` ou `tryAcquire()`.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Retour sécurisé via finally

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

### Exemple #2 Destruction automatique via beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // If the connection is broken — do not return to the pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // If isAlive() returns false, the client will be destroyed
    $pool->release($client);
}
```

## Voir aussi

- [Pool::acquire](/fr/docs/reference/pool/acquire.html) --- Acquérir une ressource du pool
- [Pool::tryAcquire](/fr/docs/reference/pool/try-acquire.html) --- Acquisition non bloquante
- [Pool::close](/fr/docs/reference/pool/close.html) --- Fermer le pool
