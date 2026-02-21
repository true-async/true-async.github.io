---
layout: docs
lang: it
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /it/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Verifica se il pool e' chiuso."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Verifica se il pool e' stato chiuso tramite una chiamata a `close()`.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Restituisce `true` se il pool e' chiuso, `false` se il pool e' attivo.

## Esempi

### Esempio #1 Verifica dello stato del pool

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

### Esempio #2 Utilizzo condizionale del pool

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

## Vedi anche

- [Pool::close](/it/docs/reference/pool/close.html) --- Chiude il pool
- [Pool::getState](/it/docs/reference/pool/get-state.html) --- Stato del Circuit Breaker
