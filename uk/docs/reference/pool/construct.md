---
layout: docs
lang: uk
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /uk/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Створення нового пулу ресурсів."
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

Створює новий пул ресурсів. Пул керує набором об'єктів багаторазового використання (з'єднання, клієнти, файлові дескриптори тощо), автоматично створюючи та знищуючи їх за потребою.

## Параметри

**factory**
: Фабрична функція для створення нового ресурсу. Викликається кожного разу, коли пулу потрібен новий ресурс і поточна кількість менша за `max`. Повинна повертати готовий до використання ресурс.

**destructor**
: Функція для коректного знищення ресурсу. Викликається при закритті пулу або при видаленні ресурсу (наприклад, після невдалої перевірки стану). `null` --- ресурс просто видаляється з пулу без додаткових дій.

**healthcheck**
: Функція перевірки стану ресурсу. Приймає ресурс, повертає `bool`. `true` --- ресурс справний, `false` --- ресурс буде знищено та замінено. `null` --- перевірка стану не виконується.

**beforeAcquire**
: Хук, що викликається перед видачею ресурсу. Приймає ресурс. Може використовуватися для підготовки ресурсу (наприклад, скидання стану). `null` --- без хука.

**beforeRelease**
: Хук, що викликається перед поверненням ресурсу до пулу. Приймає ресурс, повертає `bool`. Якщо повертає `false`, ресурс знищується замість повернення до пулу. `null` --- без хука.

**min**
: Мінімальна кількість ресурсів у пулі. При створенні пулу негайно створюється `min` ресурсів. За замовчуванням `0`.

**max**
: Максимальна кількість ресурсів у пулі. При досягненні ліміту виклики `acquire()` блокуються до звільнення ресурсу. За замовчуванням `10`.

**healthcheckInterval**
: Інтервал фонової перевірки стану ресурсів у мілісекундах. `0` --- фонова перевірка вимкнена (перевірка лише при отриманні).

## Приклади

### Приклад #1 Пул з'єднань PDO

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
        // PDO is closed automatically when removed
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
    healthcheckInterval: 30000 // check every 30 seconds
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Приклад #2 Пул з хуками

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // reset to default database
    },
    beforeRelease: function(RedisClient $r): bool {
        // If the connection is broken — destroy the resource
        return $r->isConnected();
    },
    max: 5
);
```

## Дивіться також

- [Pool::acquire](/uk/docs/reference/pool/acquire.html) --- Отримати ресурс з пулу
- [Pool::release](/uk/docs/reference/pool/release.html) --- Повернути ресурс до пулу
- [Pool::close](/uk/docs/reference/pool/close.html) --- Закрити пул
