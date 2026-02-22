---
layout: docs
lang: es
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /es/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "Número de recursos inactivos en el pool."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

Devuelve el número de recursos inactivos (no utilizados) que están listos para ser adquiridos.

## Parámetros

Este método no acepta parámetros.

## Valor de retorno

El número de recursos inactivos en el pool.

## Ejemplos

### Ejemplo #1 Seguimiento de recursos inactivos

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

### Ejemplo #2 Estrategia adaptativa

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// Si quedan pocos recursos inactivos — reducir la carga
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Advertencia: el pool está casi agotado\n";
}
```

## Ver también

- [Pool::activeCount](/es/docs/reference/pool/active-count.html) — Número de recursos activos
- [Pool::count](/es/docs/reference/pool/count.html) — Número total de recursos
