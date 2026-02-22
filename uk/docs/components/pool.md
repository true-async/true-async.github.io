---
layout: docs
lang: uk
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /uk/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- універсальний пул ресурсів для корутин: створення, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool: Універсальний пул ресурсів

## Навіщо потрібен пул

При роботі з корутинами виникає проблема спільного використання I/O-дескрипторів.
Якщо один і той самий сокет використовується двома корутинами, які одночасно записують або зчитують
різні пакети з нього, дані змішаються і результат буде непередбачуваним.
Тому не можна просто використовувати один і той самий об'єкт `PDO` в різних корутинах!

З іншого боку, створювати окреме з'єднання для кожної корутини знову і знову -- дуже марнотратна стратегія.
Це нівелює переваги конкурентного I/O. Тому зазвичай використовуються пули з'єднань
для взаємодії із зовнішніми API, базами даних та іншими ресурсами.

Пул вирішує цю проблему: ресурси створюються заздалегідь, видаються корутинам за запитом
і повертаються для повторного використання.

```php
use Async\Pool;

// Пул HTTP-з'єднань
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Корутина бере з'єднання, використовує його і повертає
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Створення пулу

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Як створити ресурс
    destructor:         fn($r) => $r->close(),          // Як знищити ресурс
    healthcheck:        fn($r) => $r->ping(),           // Чи живий ресурс?
    beforeAcquire:      fn($r) => $r->isValid(),        // Перевірка перед видачею
    beforeRelease:      fn($r) => !$r->isBroken(),      // Перевірка перед поверненням
    min:                2,                               // Попередньо створити 2 ресурси
    max:                10,                              // Максимум 10 ресурсів
    healthcheckInterval: 30000,                          // Перевіряти кожні 30 сек
);
```

| Параметр               | Призначення                                                    | За замовчуванням |
|------------------------|----------------------------------------------------------------|------------------|
| `factory`              | Створює новий ресурс. **Обов'язковий**                         | --               |
| `destructor`           | Знищує ресурс при видаленні з пулу                             | `null`           |
| `healthcheck`          | Періодична перевірка: чи живий ще ресурс?                      | `null`           |
| `beforeAcquire`        | Перевірка перед видачею. `false` -- знищити і взяти наступний   | `null`           |
| `beforeRelease`        | Перевірка перед поверненням. `false` -- знищити, не повертати   | `null`           |
| `min`                  | Скільки ресурсів створити заздалегідь (попередній прогрів)      | `0`              |
| `max`                  | Максимум ресурсів (вільних + зайнятих)                         | `10`             |
| `healthcheckInterval`  | Інтервал фонової перевірки здоров'я (мс, 0 = вимкнено)         | `0`              |

## Acquire і Release

### Блокуючий Acquire

```php
// Чекати, поки ресурс стане доступним (необмежено)
$resource = $pool->acquire();

// Чекати максимум 5 секунд
$resource = $pool->acquire(timeout: 5000);
```

Якщо пул заповнений (всі ресурси зайняті і `max` досягнуто), корутина **призупиняється**
і чекає, поки інша корутина поверне ресурс. Інші корутини продовжують працювати.

При таймауті кидається `PoolException`.

### Неблокуючий tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "All resources are busy, let's try later\n";
} else {
    // Використовуємо ресурс
    $pool->release($resource);
}
```

`tryAcquire()` повертає `null` негайно, якщо ресурс недоступний. Корутина не призупиняється.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // ВАЖЛИВО: завжди повертайте ресурс до пулу!
    $pool->release($resource);
}
```

Якщо встановлено `beforeRelease` і він повертає `false`, ресурс вважається пошкодженим
і знищується замість повернення до пулу.

## Статистика

```php
echo $pool->count();       // Загальна кількість ресурсів (вільних + зайнятих)
echo $pool->idleCount();   // Вільних, готових до видачі
echo $pool->activeCount(); // Зараз використовуються корутинами
```

## Закриття пулу

```php
$pool->close();
```

При закритті:
- Всі корутини, що очікують, отримують `PoolException`
- Всі вільні ресурси знищуються через `destructor`
- Зайняті ресурси знищуються при наступному `release`

## Healthcheck: Фонова перевірка

Якщо встановлено `healthcheckInterval`, пул періодично перевіряє вільні ресурси.
Мертві ресурси знищуються і замінюються новими (якщо кількість впала нижче `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Перевірка: чи живе з'єднання?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Кожні 10 секунд
);
```

Healthcheck працює **тільки** для вільних ресурсів. Зайняті ресурси не перевіряються.

## Circuit Breaker

Пул реалізує патерн **Circuit Breaker** для управління доступністю сервісу.

### Три стани

| Стан         | Поведінка                                            |
|--------------|------------------------------------------------------|
| `ACTIVE`     | Все працює, запити проходять                         |
| `INACTIVE`   | Сервіс недоступний, `acquire()` кидає виключення     |
| `RECOVERING` | Тестовий режим, обмежена кількість запитів            |

```php
use Async\CircuitBreakerState;

// Перевірка стану
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Ручне управління
$pool->deactivate();  // Перемкнути в INACTIVE
$pool->recover();     // Перемкнути в RECOVERING
$pool->activate();    // Перемкнути в ACTIVE
```

### Автоматичне управління через Strategy

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

Стратегія викликається автоматично:
- `reportSuccess()` -- при успішному поверненні ресурсу до пулу
- `reportFailure()` -- коли `beforeRelease` повертає `false` (ресурс пошкоджено)

## Життєвий цикл ресурсу

![Життєвий цикл ресурсу](/diagrams/uk/components-pool/resource-lifecycle.svg)

## Реальний приклад: Пул з'єднань Redis

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

// 100 корутин конкурентно читають з Redis через 20 з'єднань
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

Для PDO існує вбудована інтеграція з `Async\Pool`, яка робить пулінг повністю прозорим.
Замість ручного `acquire`/`release`, пул керується автоматично за лаштунками.

Детальніше: [PDO Pool](/uk/docs/components/pdo-pool.html)

## Що далі?

- [Архітектура Async\Pool](/uk/architecture/pool.html) -- внутрішній устрій, діаграми, C API
- [PDO Pool](/uk/docs/components/pdo-pool.html) -- прозорий пул для PDO
- [Корутини](/uk/docs/components/coroutines.html) -- як працюють корутини
- [Канали](/uk/docs/components/channels.html) -- обмін даними між корутинами
