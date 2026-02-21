---
layout: docs
lang: it
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /it/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Numero di risorse inattive nel pool."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Restituisce il numero di risorse inattive (non utilizzate) pronte per essere acquisite.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Il numero di risorse inattive nel pool.

## Esempi

### Esempio #1 Tracciamento delle risorse inattive

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

### Esempio #2 Strategia adattiva

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// Se rimangono poche risorse inattive — riduci il carico
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## Vedi anche

- [Pool::activeCount](/it/docs/reference/pool/active-count.html) --- Numero di risorse attive
- [Pool::count](/it/docs/reference/pool/count.html) --- Numero totale di risorse
