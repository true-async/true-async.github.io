---
layout: docs
lang: ru
path_key: "/docs/concepts/pdo-pool.html"
nav_active: docs
permalink: /ru/docs/concepts/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool — встроенный пул соединений с базой данных для корутин: прозрачный пулинг, транзакции, автоматический rollback."
---

# PDO Pool: пул соединений с базой данных

## Проблема

При работе с корутинами возникает проблема шаринга дескрипторов ввода вывода.
Если один и тот же сокет будет в двух корутинах, которые одновременно станут писать или читать из него
разные пакеты, то данные перемешаются, и результат будет непредсказуемым.
Поэтому невозможно просто так использовать один и тот же объект `PDO` в разных корутинах!

С другой стороны создавать отдельное соединение для каждой корутины снова и снова очень расточительная стратегия.
Она сводит на нет преймущества конкретного ввода вывода. Поэтому как правило для взаимодействия с внешними API,
Базами Данных и другими ресурсами, используют пул соединений.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Десять корутин одновременно используют один $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Другая корутина уже вызвала COMMIT на этом же соединении!
        $pdo->commit(); // Хаос
    });
}
```

Можно создавать отдельное соединение в каждой корутине, но тогда при тысяче корутин вы получите тысячу TCP-соединений.
MySQL по умолчанию разрешает 151 одновременное соединение. PostgreSQL — 100.

## Решение: PDO Pool

**PDO Pool** — встроенный в ядро PHP пул соединений с базой данных.
Он автоматически выдаёт каждой корутине своё соединение из заранее подготовленного набора
и возвращает его обратно, когда корутина закончила работу.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Десять корутин — каждая получает своё соединение
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Pool автоматически выделит соединение для этой корутины
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // Соединение возвращается в пул
    });
}
```

Снаружи код выглядит так, будто вы работаете с обычным `PDO`. Пул полностью прозрачен.

## Как включить

Пул включается через атрибуты конструктора `PDO`:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Включить пул
    PDO::ATTR_POOL_MIN                  => 0,     // Минимум соединений (по умолчанию 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Максимум соединений (по умолчанию 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Интервал проверки здоровья (сек, 0 = выключено)
]);
```

| Атрибут                     | Значение                                                              | По умолчанию |
|-----------------------------|-----------------------------------------------------------------------|--------------|
| `POOL_ENABLED`              | Включить пул                                                          | `false`      |
| `POOL_MIN`                  | Минимальное количество соединений, которые пул поддерживает открытыми | `0`          |
| `POOL_MAX`                  | Максимальное количество одновременных соединений                      | `10`         |
| `POOL_HEALTHCHECK_INTERVAL` | Как часто проверять, что соединение живое (в секундах)                | `0`          |

## Привязка соединения к корутине

Каждая корутина получает **своё** соединение из пула. Все вызовы `query()`, `exec()`, `prepare()`
внутри одной корутины идут через одно и то же соединение.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Все три запроса идут через соединение #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Корутина завершилась — соединение #1 возвращается в пул
});

$coro2 = spawn(function() use ($pdo) {
    // Все запросы идут через соединение #2
    $pdo->query("SELECT 4");
    // Корутина завершилась — соединение #2 возвращается в пул
});
```

Если корутина больше не использует соединение (нет активных транзакций и стейтментов),
пул может вернуть его раньше — не дожидаясь завершения корутины.

## Транзакции

Транзакции работают так же, как в обычном PDO. Но пул гарантирует,
что пока транзакция активна, соединение **закреплено** за корутиной и не вернётся в пул.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Только после commit соединение может вернуться в пул
});
```

### Автоматический rollback

Если корутина завершилась, не вызвав `commit()`, пул автоматически откатит транзакцию
перед возвратом соединения в пул. Это защита от случайной потери данных.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Забыли commit()
    // Корутина завершилась — пул вызовет ROLLBACK автоматически
});
```

## Жизненный цикл соединения

![Жизненный цикл соединения в пуле](/diagrams/ru/concepts-pdo-pool/connection-lifecycle.svg)

Подробная техническая диаграмма с внутренними вызовами — в [архитектуре PDO Pool](/ru/architecture/pdo-pool.html).

## Доступ к объекту пула

Метод `getPool()` возвращает объект `Async\Pool`, через который можно получить статистику:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Пул активен: " . get_class($pool) . "\n"; // Async\Pool
}
```

Если пул не включён, `getPool()` возвращает `null`.

## Когда использовать

**Используйте PDO Pool, когда:**
- Приложение работает в асинхронном режиме с TrueAsync
- Несколько корутин одновременно обращаются к базе данных
- Нужно ограничить количество соединений к БД

**Не нужен, когда:**
- Приложение синхронное (классический PHP)
- Только одна корутина работает с базой
- Используются persistent-соединения (они несовместимы с пулом)

## Поддерживаемые драйверы

| Драйвер      | Поддержка пула |
|--------------|----------------|
| `pdo_mysql`  | Да             |
| `pdo_pgsql`  | Да             |
| `pdo_sqlite` | Да             |
| `pdo_odbc`   | Нет            |

## Обработка ошибок

Если пул не смог создать соединение (неверные credentials, недоступный сервер),
исключение пробрасывается в корутину, которая запросила соединение:

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Не удалось подключиться: " . $e->getMessage() . "\n";
    }
});
```

Обратите внимание на `POOL_MIN => 0`: если установить минимум больше нуля, пул попытается
создать соединения заранее, и ошибка возникнет уже при создании объекта PDO.

## Реальный пример: параллельная обработка заказов

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Получаем список заказов для обработки
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Каждая корутина получает своё соединение из пула
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// Ждём завершения всех корутин
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Заказ #$processedId обработан\n";
}
```

Десять заказов обрабатываются конкурентно, но через максимум пять соединений к базе.
Каждая транзакция изолирована. Соединения переиспользуются между корутинами.

## Дальше что?

- [Архитектура PDO Pool](/ru/architecture/pdo-pool.html) — внутреннее устройство пула, диаграммы, жизненный цикл соединений
- [Корутины](/ru/docs/concepts/coroutines.html) — как работают корутины
- [Scope](/ru/docs/concepts/scope.html) — управление группами корутин
- [spawn()](/ru/docs/reference/spawn.html) — запуск корутин
- [await()](/ru/docs/reference/await.html) — ожидание результата
