---
layout: docs
lang: fr
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /fr/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Nombre total de ressources dans le pool."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Retourne le nombre total de ressources dans le pool, incluant à la fois les ressources
inactives et actives (en cours d'utilisation).

## Paramètres

Cette méthode ne prend aucun paramètre.

## Valeur de retour

Le nombre total de ressources dans le pool.

## Exemples

### Exemple #1 Surveillance du pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total resources: " . $pool->count() . "\n";       // 2 (min)
echo "Idle: " . $pool->idleCount() . "\n";               // 2
echo "Active: " . $pool->activeCount() . "\n";           // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // a new resource is created

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## Voir aussi

- [Pool::idleCount](/fr/docs/reference/pool/idle-count.html) --- Nombre de ressources inactives
- [Pool::activeCount](/fr/docs/reference/pool/active-count.html) --- Nombre de ressources actives
