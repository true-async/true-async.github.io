---
layout: docs
lang: fr
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /fr/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Nombre de ressources actives dans le pool."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Retourne le nombre de ressources actuellement en cours d'utilisation
(acquises via `acquire()` ou `tryAcquire()` et pas encore retournées
via `release()`).

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Le nombre de ressources actives.

## Exemples

### Exemple #1 Comptage des ressources actives

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

echo $pool->activeCount() . "\n"; // 0

$r1 = $pool->acquire();
$r2 = $pool->acquire();
echo $pool->activeCount() . "\n"; // 2

$pool->release($r1);
echo $pool->activeCount() . "\n"; // 1
```

### Exemple #2 Affichage des statistiques du pool

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, active=%d, idle=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## Voir aussi

- [Pool::idleCount](/fr/docs/reference/pool/idle-count.html) --- Nombre de ressources inactives
- [Pool::count](/fr/docs/reference/pool/count.html) --- Nombre total de ressources
