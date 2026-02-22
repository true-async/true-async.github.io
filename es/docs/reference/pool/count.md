---
layout: docs
lang: es
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /es/docs/reference/pool/count.html
page_title: "Pool::count"
description: "Número total de recursos en el pool."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

Devuelve el número total de recursos en el pool, incluyendo tanto recursos
inactivos como activos (en uso).

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

El número total de recursos en el pool.

## Ejemplos

### Ejemplo #1 Monitoreo del pool

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total de recursos: " . $pool->count() . "\n";       // 2 (min)
echo "Inactivos: " . $pool->idleCount() . "\n";            // 2
echo "Activos: " . $pool->activeCount() . "\n";             // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // se crea un nuevo recurso

echo "Total de recursos: " . $pool->count() . "\n";       // 3
echo "Inactivos: " . $pool->idleCount() . "\n";            // 0
echo "Activos: " . $pool->activeCount() . "\n";             // 3
```

## Ver también

- [Pool::idleCount](/es/docs/reference/pool/idle-count.html) — Número de recursos inactivos
- [Pool::activeCount](/es/docs/reference/pool/active-count.html) — Número de recursos activos
