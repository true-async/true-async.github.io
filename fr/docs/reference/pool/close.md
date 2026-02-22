---
layout: docs
lang: fr
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /fr/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Fermer le pool et détruire toutes les ressources."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Ferme le pool de ressources. Toutes les ressources inactives sont détruites via le `destructor`
(si un destructeur a été fourni). Toutes les coroutines en attente d'une ressource via `acquire()` reçoivent
une `PoolException`. Après la fermeture, tout appel à `acquire()` et `tryAcquire()`
lève une exception.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Aucune valeur n'est retournée.

## Exemples

### Exemple #1 Arrêt gracieux

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Close all prepared statements and connection
    },
    min: 2,
    max: 10
);

// ... work with the pool ...

// Close the pool when the application shuts down
$pool->close();
```

### Exemple #2 Les coroutines en attente reçoivent une exception

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // took the only resource

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // waiting for release
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // waiting coroutine will receive PoolException
```

## Voir aussi

- [Pool::isClosed](/fr/docs/reference/pool/is-closed.html) --- Vérifier si le pool est fermé
- [Pool::__construct](/fr/docs/reference/pool/construct.html) --- Créer un pool
