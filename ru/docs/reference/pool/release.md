---
layout: docs
lang: ru
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /ru/docs/reference/pool/release.html
page_title: "Pool::release"
description: "Возврат ресурса в пул."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

Возвращает ранее полученный ресурс обратно в пул. Если при создании пула
был задан `beforeRelease` хук, он вызывается перед возвратом. Если хук
возвращает `false`, ресурс уничтожается вместо возврата в пул.

Если есть корутины, ожидающие ресурс через `acquire()`, ресурс сразу
передаётся первому ожидающему.

## Параметры

**resource**
: Ресурс, ранее полученный через `acquire()` или `tryAcquire()`.

## Возвращаемые значения

Функция не возвращает значения.

## Примеры

### Пример #1 Безопасный возврат через finally

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

### Пример #2 Автоматическое уничтожение через beforeRelease

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // Если соединение разорвано — не возвращать в пул
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // Если isAlive() вернёт false, клиент будет уничтожен
    $pool->release($client);
}
```

## См. также

- [Pool::acquire](/ru/docs/reference/pool/acquire.html) — Получить ресурс из пула
- [Pool::tryAcquire](/ru/docs/reference/pool/try-acquire.html) — Неблокирующее получение
- [Pool::close](/ru/docs/reference/pool/close.html) — Закрыть пул
