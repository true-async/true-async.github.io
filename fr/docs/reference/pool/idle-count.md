---
layout: docs
lang: fr
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /fr/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Nombre de ressources inactives dans le pool."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Retourne le nombre de ressources inactives (non utilisées) prêtes à être acquises.

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Le nombre de ressources inactives dans le pool.

## Exemples

### Exemple #1 Suivi des ressources inactives

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 3,
    max: 10
);

echo $pool->idleCount() . "\n"; // 3

$conn = $pool->acquire();
echo $pool->idleCount() . "\n"; // 2

$pool->release($conn);
echo $pool->idleCount() . "\n"; // 3
```

### Exemple #2 Stratégie adaptative

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// If few idle resources remain — reduce load
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## Voir aussi

- [Pool::activeCount](/fr/docs/reference/pool/active-count.html) --- Nombre de ressources actives
- [Pool::count](/fr/docs/reference/pool/count.html) --- Nombre total de ressources
