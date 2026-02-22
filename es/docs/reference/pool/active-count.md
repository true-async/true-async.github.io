---
layout: docs
lang: es
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /es/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "Número de recursos activos en el pool."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

Devuelve el número de recursos que están actualmente en uso
(adquiridos mediante `acquire()` o `tryAcquire()` y aún no devueltos
mediante `release()`).

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

El número de recursos activos.

## Ejemplos

### Ejemplo #1 Conteo de recursos activos

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

### Ejemplo #2 Mostrar estadísticas del pool

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, activos=%d, inactivos=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## Ver también

- [Pool::idleCount](/es/docs/reference/pool/idle-count.html) — Número de recursos inactivos
- [Pool::count](/es/docs/reference/pool/count.html) — Número total de recursos
