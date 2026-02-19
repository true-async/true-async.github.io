---
layout: docs
lang: ru
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /ru/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Создание нового пула ресурсов."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Создаёт новый пул ресурсов. Пул управляет набором переиспользуемых объектов
(соединений, клиентов, файловых дескрипторов и т.д.), автоматически создавая
и уничтожая их по мере необходимости.

## Параметры

**factory**
: Функция-фабрика для создания нового ресурса. Вызывается каждый раз,
  когда пулу нужен новый ресурс и текущее количество меньше `max`.
  Должна возвращать готовый к использованию ресурс.

**destructor**
: Функция для корректного уничтожения ресурса. Вызывается при закрытии пула
  или при удалении ресурса (например, после неудачной проверки здоровья).
  `null` — ресурс просто удаляется из пула без дополнительных действий.

**healthcheck**
: Функция проверки здоровья ресурса. Принимает ресурс, возвращает `bool`.
  `true` — ресурс исправен, `false` — ресурс будет уничтожен и заменён.
  `null` — проверка здоровья не выполняется.

**beforeAcquire**
: Хук, вызываемый перед выдачей ресурса. Принимает ресурс.
  Может использоваться для подготовки ресурса (например, сброс состояния).
  `null` — без хука.

**beforeRelease**
: Хук, вызываемый перед возвратом ресурса в пул. Принимает ресурс,
  возвращает `bool`. Если возвращает `false` — ресурс уничтожается вместо
  возврата в пул.
  `null` — без хука.

**min**
: Минимальное количество ресурсов в пуле. При создании пула сразу создаётся
  `min` ресурсов. По умолчанию `0`.

**max**
: Максимальное количество ресурсов в пуле. При достижении лимита
  вызовы `acquire()` блокируются до освобождения ресурса.
  По умолчанию `10`.

**healthcheckInterval**
: Интервал фоновой проверки здоровья ресурсов в миллисекундах.
  `0` — фоновая проверка отключена (проверка только при выдаче).

## Примеры

### Пример #1 Пул PDO-соединений

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO закрывается автоматически при удалении
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // проверка каждые 30 секунд
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Пример #2 Пул с хуками

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // сброс на базу по умолчанию
    },
    beforeRelease: function(RedisClient $r): bool {
        // Если соединение разорвано — уничтожить ресурс
        return $r->isConnected();
    },
    max: 5
);
```

## См. также

- [Pool::acquire](/ru/docs/reference/pool/acquire.html) — Получить ресурс из пула
- [Pool::release](/ru/docs/reference/pool/release.html) — Вернуть ресурс в пул
- [Pool::close](/ru/docs/reference/pool/close.html) — Закрыть пул
