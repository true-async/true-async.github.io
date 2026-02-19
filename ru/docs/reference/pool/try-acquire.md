---
layout: docs
lang: ru
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /ru/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Неблокирующее получение ресурса из пула."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Пытается получить ресурс из пула без блокировки. Если свободный ресурс
доступен или лимит `max` не достигнут, возвращает ресурс немедленно.
В противном случае возвращает `null`.

## Параметры

Метод не принимает параметров.

## Возвращаемые значения

Возвращает ресурс из пула или `null`, если свободных ресурсов нет
и достигнут максимальный лимит.

## Примеры

### Пример #1 Попытка получить ресурс

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "Все соединения заняты, попробуйте позже\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Заказов: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Пример #2 Фолбэк при недоступности пула

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // Кэш недоступен — обращаемся напрямую к БД
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## См. также

- [Pool::acquire](/ru/docs/reference/pool/acquire.html) — Блокирующее получение ресурса
- [Pool::release](/ru/docs/reference/pool/release.html) — Вернуть ресурс в пул
