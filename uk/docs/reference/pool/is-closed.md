---
layout: docs
lang: uk
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Перевірка, чи закрито пул."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Перевіряє, чи було закрито пул викликом `close()`.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Повертає `true`, якщо пул закрито, `false`, якщо пул активний.

## Приклади

### Приклад #1 Перевірка стану пулу

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

### Приклад #2 Умовне використання пулу

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

## Дивіться також

- [Pool::close](/uk/docs/reference/pool/close.html) --- Закрити пул
- [Pool::getState](/uk/docs/reference/pool/get-state.html) --- Стан Circuit Breaker
