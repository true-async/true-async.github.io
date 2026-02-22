---
layout: docs
lang: uk
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /uk/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Отримання ресурсу з пулу з очікуванням."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Отримує ресурс з пулу. Якщо вільних ресурсів немає і максимальний ліміт досягнуто, корутина блокується до звільнення ресурсу.

Якщо в пулі є вільний ресурс, він повертається негайно. Якщо вільних ресурсів немає, але ліміт `max` ще не досягнуто, створюється новий ресурс через `factory`. В іншому випадку виклик очікує звільнення ресурсу.

## Параметри

**timeout**
: Максимальний час очікування в мілісекундах.
  `0` --- очікувати необмежено.
  Якщо тайм-аут перевищено, викидається `PoolException`.

## Значення, що повертається

Повертає ресурс з пулу.

## Помилки

Викидає `Async\PoolException`, якщо:
- Перевищено тайм-аут очікування.
- Пул закрито.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Get a connection (waits if necessary)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Приклад #2 З тайм-аутом

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // wait no more than 5 seconds
    // work with connection...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## Дивіться також

- [Pool::tryAcquire](/uk/docs/reference/pool/try-acquire.html) --- Неблокуюче отримання ресурсу
- [Pool::release](/uk/docs/reference/pool/release.html) --- Повернути ресурс до пулу
- [Pool::__construct](/uk/docs/reference/pool/construct.html) --- Створити пул
