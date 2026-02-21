---
layout: docs
lang: it
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /it/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Numero totale di risorse nel pool."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Restituisce il numero totale di risorse nel pool, incluse sia le risorse inattive
che quelle attive (in uso).

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Il numero totale di risorse nel pool.

## Esempi

### Esempio #1 Monitoraggio del pool

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
$conn3 = $pool->acquire(); // viene creata una nuova risorsa

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## Vedi anche

- [Pool::idleCount](/it/docs/reference/pool/idle-count.html) --- Numero di risorse inattive
- [Pool::activeCount](/it/docs/reference/pool/active-count.html) --- Numero di risorse attive
