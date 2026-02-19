---
layout: docs
lang: ru
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "Проверка, закрыт ли пул."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

Проверяет, был ли пул закрыт вызовом `close()`.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Возвращает `true`, если пул закрыт, `false` — если пул активен.

## Примеры

### Пример #1 Проверка состояния пула

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

### Пример #2 Условное использование пула

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Пул соединений закрыт');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## См. также

- [Pool::close](/ru/docs/reference/pool/close.html) — Закрыть пул
- [Pool::getState](/ru/docs/reference/pool/get-state.html) — Состояние Circuit Breaker
