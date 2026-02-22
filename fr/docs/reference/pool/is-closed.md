---
layout: docs
lang: fr
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /fr/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Vérifier si le pool est fermé."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Vérifie si le pool a été fermé par un appel à `close()`.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Retourne `true` si le pool est fermé, `false` si le pool est actif.

## Exemples

### Exemple #1 Vérification de l'état du pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### Exemple #2 Utilisation conditionnelle du pool

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Connection pool is closed');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## Voir aussi

- [Pool::close](/fr/docs/reference/pool/close.html) --- Fermer le pool
- [Pool::getState](/fr/docs/reference/pool/get-state.html) --- État du Circuit Breaker
