---
layout: docs
lang: uk
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /uk/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Повернення ресурсу до пулу."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Повертає раніше отриманий ресурс назад до пулу. Якщо при створенні пулу був встановлений хук `beforeRelease`, він викликається перед поверненням. Якщо хук повертає `false`, ресурс знищується замість повернення до пулу.

Якщо є корутини, що очікують ресурс через `acquire()`, ресурс негайно передається першій очікуючій корутині.

## Параметри

**resource**
: Ресурс, раніше отриманий через `acquire()` або `tryAcquire()`.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Безпечне повернення через finally

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### Приклад #2 Автоматичне знищення через beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // If the connection is broken — do not return to the pool
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // If isAlive() returns false, the client will be destroyed
    $pool->release($client);
}
```

## Дивіться також

- [Pool::acquire](/uk/docs/reference/pool/acquire.html) --- Отримати ресурс з пулу
- [Pool::tryAcquire](/uk/docs/reference/pool/try-acquire.html) --- Неблокуюче отримання
- [Pool::close](/uk/docs/reference/pool/close.html) --- Закрити пул
