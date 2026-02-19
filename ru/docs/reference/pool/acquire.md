---
layout: docs
lang: ru
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /ru/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "Получение ресурса из пула с ожиданием."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

Получает ресурс из пула. Если свободных ресурсов нет и достигнут максимальный
лимит, корутина блокируется до появления свободного ресурса.

Если в пуле есть свободный ресурс, он выдаётся немедленно. Если свободных нет,
но лимит `max` не достигнут, создаётся новый ресурс через `factory`. Иначе
вызов ожидает освобождения ресурса.

## Параметры

**timeout**
: Максимальное время ожидания в миллисекундах.
  `0` — ожидание без ограничения по времени.
  При превышении таймаута выбрасывается `PoolException`.

## Возвращаемые значения

Возвращает ресурс из пула.

## Ошибки

Выбрасывает `Async\PoolException`, если:
- Превышен таймаут ожидания.
- Пул закрыт.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// Получить соединение (ждёт если нужно)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### Пример #2 С таймаутом

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // ждать не более 5 секунд
    // работа с соединением...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Не удалось получить ресурс: {$e->getMessage()}\n";
}
```

## См. также

- [Pool::tryAcquire](/ru/docs/reference/pool/try-acquire.html) — Неблокирующее получение ресурса
- [Pool::release](/ru/docs/reference/pool/release.html) — Вернуть ресурс в пул
- [Pool::__construct](/ru/docs/reference/pool/construct.html) — Создание пула
