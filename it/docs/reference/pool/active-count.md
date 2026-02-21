---
layout: docs
lang: it
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /it/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Numero di risorse attive nel pool."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Restituisce il numero di risorse attualmente in uso
(acquisite tramite `acquire()` o `tryAcquire()` e non ancora restituite
tramite `release()`).

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Il numero di risorse attive.

## Esempi

### Esempio #1 Conteggio delle risorse attive

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

### Esempio #2 Visualizzazione delle statistiche del pool

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

## Vedi anche

- [Pool::idleCount](/it/docs/reference/pool/idle-count.html) --- Numero di risorse inattive
- [Pool::count](/it/docs/reference/pool/count.html) --- Numero totale di risorse
