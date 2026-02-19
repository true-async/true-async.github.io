---
layout: docs
lang: ru
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /ru/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Закрытие пула и уничтожение всех ресурсов."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Закрывает пул ресурсов. Все свободные ресурсы уничтожаются через `destructor`
(если он задан). Все корутины, ожидающие ресурс через `acquire()`, получают
`PoolException`. После закрытия любые вызовы `acquire()` и `tryAcquire()`
выбрасывают исключение.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Корректное завершение работы

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Закрыть все подготовленные запросы и соединение
    },
    min: 2,
    max: 10
);

// ... работа с пулом ...

// Закрываем пул при завершении приложения
$pool->close();
```

### Пример #2 Ожидающие корутины получают исключение

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // забрали единственный ресурс

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // ждёт освобождения
    } catch (PoolException $e) {
        echo "Пул закрыт: {$e->getMessage()}\n";
    }
});

$pool->close(); // ожидающая корутина получит PoolException
```

## См. также

- [Pool::isClosed](/ru/docs/reference/pool/is-closed.html) — Проверить, закрыт ли пул
- [Pool::__construct](/ru/docs/reference/pool/construct.html) — Создание пула
