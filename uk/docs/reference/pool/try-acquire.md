---
layout: docs
lang: uk
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /uk/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "Неблокуюче отримання ресурсу з пулу."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

Намагається отримати ресурс з пулу без блокування. Якщо вільний ресурс доступний або ліміт `max` ще не досягнуто, повертає ресурс негайно. В іншому випадку повертає `null`.

## Параметри

Цей метод не приймає параметрів.

## Значення, що повертається

Повертає ресурс з пулу або `null`, якщо вільних ресурсів немає і максимальний ліміт досягнуто.

## Приклади

### Приклад #1 Спроба отримати ресурс

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "All connections are busy, try again later\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Orders: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### Приклад #2 Запасний варіант при недоступності пулу

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
        // Cache unavailable — query database directly
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## Дивіться також

- [Pool::acquire](/uk/docs/reference/pool/acquire.html) --- Блокуюче отримання ресурсу
- [Pool::release](/uk/docs/reference/pool/release.html) --- Повернути ресурс до пулу
