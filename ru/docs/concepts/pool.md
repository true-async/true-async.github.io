---
layout: docs
lang: ru
path_key: "/docs/concepts/pool.html"
nav_active: docs
permalink: /ru/docs/concepts/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool — универсальный пул ресурсов для корутин: создание, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool: универсальный пул ресурсов

## Зачем нужен пул

При работе с корутинами возникает проблема шаринга дескрипторов ввода вывода.
Если один и тот же сокет будет в двух корутинах, которые одновременно станут писать или читать из него
разные пакеты, то данные перемешаются, и результат будет непредсказуемым.
Поэтому невозможно просто так использовать один и тот же объект `PDO` в разных корутинах!

С другой стороны создавать отдельное соединение для каждой корутины снова и снова очень расточительная стратегия.
Она сводит на нет преймущества конкретного ввода вывода. Поэтому как правило для взаимодействия с внешними API,
Базами Данных и другими ресурсами, используют пул соединений.

Пул решает эту проблему: ресурсы создаются заранее, выдаются корутинам по запросу
и возвращаются для повторного использования.

```php
use Async\Pool;

// Пул HTTP-соединений
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Корутина берёт соединение, использует и возвращает
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Создание пула

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Как создать ресурс
    destructor:         fn($r) => $r->close(),          // Как уничтожить ресурс
    healthcheck:        fn($r) => $r->ping(),           // Жив ли ресурс?
    beforeAcquire:      fn($r) => $r->isValid(),        // Проверка перед выдачей
    beforeRelease:      fn($r) => !$r->isBroken(),      // Проверка перед возвратом
    min:                2,                               // Предсоздать 2 ресурса
    max:                10,                              // Максимум 10 ресурсов
    healthcheckInterval: 30000,                          // Проверка каждые 30 сек
);
```

| Параметр              | Назначение                                                     | По умолчанию |
|-----------------------|----------------------------------------------------------------|--------------|
| `factory`             | Создаёт новый ресурс. **Обязательный**                         | —            |
| `destructor`          | Уничтожает ресурс при удалении из пула                         | `null`       |
| `healthcheck`         | Периодическая проверка: ресурс ещё жив?                        | `null`       |
| `beforeAcquire`       | Проверка перед выдачей. `false` — уничтожить и взять следующий | `null`       |
| `beforeRelease`       | Проверка перед возвратом. `false` — уничтожить, не возвращать  | `null`       |
| `min`                 | Сколько ресурсов создать заранее (pre-warming)                 | `0`          |
| `max`                 | Максимум ресурсов (свободные + занятые)                        | `10`         |
| `healthcheckInterval` | Интервал фоновой проверки здоровья (мс, 0 = выключено)         | `0`          |

## Acquire и Release

### Блокирующий acquire

```php
// Ждать, пока ресурс не освободится (бесконечно)
$resource = $pool->acquire();

// Ждать максимум 5 секунд
$resource = $pool->acquire(timeout: 5000);
```

Если пул заполнен (все ресурсы заняты и достигнут `max`), корутина **приостанавливается**
и ждёт, пока другая корутина не вернёт ресурс. Другие корутины продолжают работать.

При таймауте выбрасывается `PoolException`.

### Неблокирующий tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "Все ресурсы заняты, попробуем позже\n";
} else {
    // Используем ресурс
    $pool->release($resource);
}
```

`tryAcquire()` возвращает `null` немедленно, если ресурс недоступен. Корутина не приостанавливается.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // ВАЖНО: всегда возвращайте ресурс в пул!
    $pool->release($resource);
}
```

Если задан `beforeRelease` и он вернул `false`, ресурс считается повреждённым
и уничтожается вместо возврата в пул.

## Статистика

```php
echo $pool->count();       // Всего ресурсов (свободные + занятые)
echo $pool->idleCount();   // Свободные, готовые к выдаче
echo $pool->activeCount(); // Сейчас используются корутинами
```

## Закрытие пула

```php
$pool->close();
```

При закрытии:
- Все ожидающие корутины получают `PoolException`
- Все свободные ресурсы уничтожаются через `destructor`
- Занятые ресурсы уничтожаются при последующем `release`

## Healthcheck: фоновая проверка

Если задан `healthcheckInterval`, пул периодически проверяет свободные ресурсы.
Мёртвые ресурсы уничтожаются и заменяются новыми (если количество упало ниже `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Проверяем: соединение живо?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Каждые 10 секунд
);
```

Healthcheck работает **только** для свободных ресурсов. Занятые ресурсы не проверяются.

## Circuit Breaker

Пул реализует паттерн **Circuit Breaker** для управления доступностью сервиса.

### Три состояния

| Состояние    | Поведение                                             |
|--------------|-------------------------------------------------------|
| `ACTIVE`     | Всё работает, запросы проходят                        |
| `INACTIVE`   | Сервис недоступен, `acquire()` выбрасывает исключение |
| `RECOVERING` | Тестовый режим, ограниченные запросы                  |

```php
use Async\CircuitBreakerState;

// Проверить состояние
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Ручное управление
$pool->deactivate();  // Перевести в INACTIVE
$pool->recover();     // Перевести в RECOVERING
$pool->activate();    // Перевести в ACTIVE
```

### Автоматическое управление через стратегию

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

Стратегия вызывается автоматически:
- `reportSuccess()` — при успешном возврате ресурса в пул
- `reportFailure()` — когда `beforeRelease` вернул `false` (ресурс повреждён)

## Жизненный цикл ресурса

![Жизненный цикл ресурса](/diagrams/ru/concepts-pool/resource-lifecycle.svg)

## Реальный пример: пул Redis-соединений

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 корутин параллельно читают из Redis через 20 соединений
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO Pool

Для PDO существует встроенная интеграция с `Async\Pool`, которая делает пулинг полностью прозрачным.
Вместо ручного `acquire`/`release` пул управляется автоматически за кулисами.

Подробнее: [PDO Pool](/ru/docs/concepts/pdo-pool.html)

## Дальше что?

- [Архитектура Async\Pool](/ru/architecture/pool.html) — внутреннее устройство, диаграммы, C API
- [PDO Pool](/ru/docs/concepts/pdo-pool.html) — прозрачный пул для PDO
- [Корутины](/ru/docs/concepts/coroutines.html) — как работают корутины
- [Каналы](/ru/docs/concepts/channels.html) — обмен данными между корутинами
