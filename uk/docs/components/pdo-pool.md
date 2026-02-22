---
layout: docs
lang: uk
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /uk/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- вбудований пул з'єднань з базою даних для корутин: прозорий пулінг, транзакції, автоматичний відкат."
---

# PDO Pool: Пул з'єднань з базою даних

## Проблема

При роботі з корутинами виникає проблема спільного використання I/O-дескрипторів.
Якщо один і той самий сокет використовується двома корутинами, які одночасно записують або зчитують
різні пакети з нього, дані змішаються і результат буде непередбачуваним.
Тому не можна просто використовувати один і той самий об'єкт `PDO` в різних корутинах!

З іншого боку, створювати окреме з'єднання для кожної корутини знову і знову -- дуже марнотратна стратегія.
Це нівелює переваги конкурентного I/O. Тому зазвичай використовуються пули з'єднань
для взаємодії із зовнішніми API, базами даних та іншими ресурсами.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Десять корутин одночасно використовують один і той же $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Інша корутина вже викликала COMMIT на цьому ж з'єднанні!
        $pdo->commit(); // Хаос
    });
}
```

Можна створювати окреме з'єднання в кожній корутині, але тоді при тисячі корутин буде тисяча TCP-з'єднань.
MySQL дозволяє 151 одночасне з'єднання за замовчуванням. PostgreSQL -- 100.

## Рішення: PDO Pool

**PDO Pool** -- пул з'єднань з базою даних, вбудований у ядро PHP.
Він автоматично надає кожній корутині власне з'єднання з заздалегідь підготовленого набору
і повертає його назад, коли корутина завершує роботу.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Десять корутин -- кожна отримує власне з'єднання
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Пул автоматично виділяє з'єднання для цієї корутини
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // З'єднання повертається до пулу
    });
}
```

Зовні код виглядає так, наче ви працюєте зі звичайним `PDO`. Пул повністю прозорий.

## Як увімкнути

Пул вмикається через атрибути конструктора `PDO`:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Увімкнути пул
    PDO::ATTR_POOL_MIN                  => 0,     // Мінімум з'єднань (за замовчуванням 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Максимум з'єднань (за замовчуванням 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Інтервал перевірки здоров'я (сек, 0 = вимкнено)
]);
```

| Атрибут                     | Значення                                                         | За замовчуванням |
|-----------------------------|------------------------------------------------------------------|------------------|
| `POOL_ENABLED`              | Увімкнути пул                                                    | `false`          |
| `POOL_MIN`                  | Мінімальна кількість з'єднань, що підтримуються відкритими       | `0`              |
| `POOL_MAX`                  | Максимальна кількість одночасних з'єднань                        | `10`             |
| `POOL_HEALTHCHECK_INTERVAL` | Як часто перевіряти, що з'єднання живе (у секундах)              | `0`              |

## Прив'язка з'єднань до корутин

Кожна корутина отримує **власне** з'єднання з пулу. Всі виклики `query()`, `exec()`, `prepare()`
в межах однієї корутини проходять через одне з'єднання.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Всі три запити йдуть через з'єднання #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Корутина завершилась -- з'єднання #1 повертається до пулу
});

$coro2 = spawn(function() use ($pdo) {
    // Всі запити йдуть через з'єднання #2
    $pdo->query("SELECT 4");
    // Корутина завершилась -- з'єднання #2 повертається до пулу
});
```

Якщо корутина більше не використовує з'єднання (немає активних транзакцій або виразів),
пул може повернути його раніше -- не чекаючи завершення корутини.

## Транзакції

Транзакції працюють так само, як у звичайному PDO. Але пул гарантує,
що поки транзакція активна, з'єднання **закріплене** за корутиною і не повернеться до пулу.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Тільки після commit з'єднання може повернутися до пулу
});
```

### Автоматичний відкат

Якщо корутина завершується без виклику `commit()`, пул автоматично відкочує транзакцію
перед поверненням з'єднання до пулу. Це захист від випадкової втрати даних.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Забули commit()
    // Корутина завершилась -- пул автоматично викличе ROLLBACK
});
```

## Життєвий цикл з'єднання

![Життєвий цикл з'єднання в пулі](/diagrams/uk/components-pdo-pool/connection-lifecycle.svg)

Детальна технічна діаграма з внутрішніми викликами -- в [архітектурі PDO Pool](/uk/architecture/pdo-pool.html).

## Доступ до об'єкта пулу

Метод `getPool()` повертає об'єкт `Async\Pool`, через який можна отримати статистику:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool is active: " . get_class($pool) . "\n"; // Async\Pool
}
```

Якщо пул не увімкнений, `getPool()` повертає `null`.

## Коли використовувати

**Використовуйте PDO Pool, коли:**
- Застосунок працює в асинхронному режимі з TrueAsync
- Кілька корутин одночасно звертаються до бази даних
- Потрібно обмежити кількість з'єднань до бази даних

**Не потрібен, коли:**
- Застосунок синхронний (класичний PHP)
- Лише одна корутина працює з базою даних
- Використовуються постійні з'єднання (вони несумісні з пулом)

## Підтримувані драйвери

| Драйвер      | Підтримка пулу |
|--------------|----------------|
| `pdo_mysql`  | Так            |
| `pdo_pgsql`  | Так            |
| `pdo_sqlite` | Так            |
| `pdo_odbc`   | Ні             |

## Обробка помилок

Якщо пул не може створити з'єднання (неправильні облікові дані, недоступний сервер),
виключення передається корутині, яка запросила з'єднання:

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
        echo "Failed to connect: " . $e->getMessage() . "\n";
    }
});
```

Зверніть увагу на `POOL_MIN => 0`: якщо встановити мінімум більше нуля, пул спробує
створити з'єднання заздалегідь, і помилка виникне при створенні об'єкта PDO.

## Реальний приклад: Паралельна обробка замовлень

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Отримуємо список замовлень для обробки
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Кожна корутина отримує власне з'єднання з пулу
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

// Чекаємо завершення всіх корутин
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Order #$processedId processed\n";
}
```

Десять замовлень обробляються конкурентно, але через максимум п'ять з'єднань до бази даних.
Кожна транзакція ізольована. З'єднання повторно використовуються між корутинами.

## Що далі?

- [Інтерактивна демонстрація PDO Pool](/uk/interactive/pdo-pool-demo.html) -- візуальна демонстрація роботи пулу з'єднань
- [Архітектура PDO Pool](/uk/architecture/pdo-pool.html) -- внутрішній устрій пулу, діаграми, життєвий цикл з'єднання
- [Корутини](/uk/docs/components/coroutines.html) -- як працюють корутини
- [Scope](/uk/docs/components/scope.html) -- управління групами корутин
- [spawn()](/uk/docs/reference/spawn.html) -- запуск корутин
- [await()](/uk/docs/reference/await.html) -- очікування результатів
