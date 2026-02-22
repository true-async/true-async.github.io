---
layout: docs
lang: uk
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /uk/docs/reference/pool/close.html
page_title: "Pool::close"
description: "Закриття пулу та знищення всіх ресурсів."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

Закриває пул ресурсів. Усі вільні ресурси знищуються через `destructor` (якщо він був наданий). Усі корутини, що очікують ресурс через `acquire()`, отримують `PoolException`. Після закриття будь-які виклики `acquire()` та `tryAcquire()` викидають виняток.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Коректне завершення роботи

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Close all prepared statements and connection
    },
    min: 2,
    max: 10
);

// ... work with the pool ...

// Close the pool when the application shuts down
$pool->close();
```

### Приклад #2 Корутини, що очікують, отримують виняток

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // took the only resource

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // waiting for release
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // waiting coroutine will receive PoolException
```

## Дивіться також

- [Pool::isClosed](/uk/docs/reference/pool/is-closed.html) --- Перевірити, чи закрито пул
- [Pool::__construct](/uk/docs/reference/pool/construct.html) --- Створити пул
