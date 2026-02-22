---
layout: docs
lang: uk
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /uk/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — конкурентна ітерація по масиву або Traversable з контролем паралелізму та управлінням життєвим циклом породжених корутин."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Конкурентно ітерує по масиву або `Traversable`, викликаючи `callback` для кожного елемента.

## Опис

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Виконує `callback` для кожного елемента `iterable` в окремій корутині.
Параметр `concurrency` дозволяє обмежити кількість одночасно виконуваних callback-ів.
Функція блокує поточну корутину до завершення всіх ітерацій.

Усі корутини, породжені через `iterate()`, виконуються в ізольованому дочірньому `Scope`.

## Параметри

**`iterable`**
Масив або об'єкт, що реалізує `Traversable` (включаючи генератори та `ArrayIterator`).

**`callback`**
Функція, яка викликається для кожного елемента. Приймає два аргументи: `(mixed $value, mixed $key)`.
Якщо callback повертає `false`, ітерація зупиняється.

**`concurrency`**
Максимальна кількість одночасно виконуваних callback-ів. За замовчуванням `0` — ліміт за замовчуванням,
усі елементи обробляються конкурентно. Значення `1` означає виконання в одній корутині.

**`cancelPending`**
Контролює поведінку дочірніх корутин, породжених усередині callback (через `spawn()`), після завершення ітерації.
- `true` (за замовчуванням) — усі незавершені породжені корутини скасовуються з `AsyncCancellation`.
- `false` — `iterate()` чекає завершення всіх породжених корутин перед поверненням.

## Значення, що повертаються

Функція не повертає значення.

## Помилки/Винятки

- `Error` — якщо викликано поза асинхронним контекстом або з контексту планувальника.
- `TypeError` — якщо `iterable` не є масивом і не реалізує `Traversable`.
- Якщо callback викидає виняток, ітерація зупиняється, решта корутин скасовується, а виняток передається у викликаючий код.

## Приклади

### Приклад #1 Базова ітерація по масиву

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $urls = [
        'php'    => 'https://php.net',
        'github' => 'https://github.com',
        'google' => 'https://google.com',
    ];

    iterate($urls, function(string $url, string $name) {
        $content = file_get_contents($url);
        echo "$name: " . strlen($content) . " bytes\n";
    });

    echo "All requests completed\n";
});
?>
```

### Приклад #2 Обмеження паралелізму

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Обробляти не більше 10 користувачів одночасно
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "User $userId loaded\n";
    }, concurrency: 10);

    echo "All users processed\n";
});
?>
```

### Приклад #3 Зупинка ітерації за умовою

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Processing: $item\n";

        if ($item === 'cherry') {
            return false; // Зупинити ітерацію
        }
    });

    echo "Iteration finished\n";
});
?>
```

**Вивід:**
```
Processing: apple
Processing: banana
Processing: cherry
Iteration finished
```

### Приклад #4 Ітерація по генератору

```php
<?php
use function Async\spawn;
use function Async\iterate;

function generateTasks(): Generator {
    for ($i = 1; $i <= 5; $i++) {
        yield "task-$i" => $i;
    }
}

spawn(function() {
    iterate(generateTasks(), function(int $value, string $key) {
        echo "$key: processing value $value\n";
    }, concurrency: 2);

    echo "All tasks completed\n";
});
?>
```

### Приклад #5 Скасування породжених корутин (cancelPending = true)

За замовчуванням корутини, породжені через `spawn()` усередині callback, скасовуються після завершення ітерації:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Породити фонову задачу
        spawn(function() use ($value) {
            try {
                echo "Background task $value started\n";
                suspend();
                suspend();
                echo "Background task $value finished\n"; // Не виконається
            } catch (AsyncCancellation) {
                echo "Background task $value cancelled\n";
            }
        });
    });

    echo "Iteration finished\n";
});
?>
```

**Вивід:**
```
Background task 1 started
Background task 2 started
Background task 3 started
Background task 1 cancelled
Background task 2 cancelled
Background task 3 cancelled
Iteration finished
```

### Приклад #6 Очікування породжених корутин (cancelPending = false)

Якщо передати `cancelPending: false`, `iterate()` чекатиме завершення всіх породжених корутин:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Породити фонову задачу
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "result-$value";
        });
    }, cancelPending: false);

    // Усі фонові задачі завершилися
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Вивід:**
```
result-1, result-2, result-3
```

### Приклад #7 Обробка помилок

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Error processing element $value");
            }
            echo "Processed: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Caught: " . $e->getMessage() . "\n";
    }
});
?>
```

## Примітки

> **Примітка:** `iterate()` створює ізольований дочірній Scope для всіх породжених корутин.

> **Примітка:** Коли передається масив, `iterate()` створює його копію перед ітерацією.
> Зміна оригінального масиву всередині callback не впливає на ітерацію.

> **Примітка:** Якщо `callback` повертає `false`, ітерація зупиняється,
> але вже запущені корутини продовжують виконуватися до завершення (або скасування, якщо `cancelPending = true`).

## Журнал змін

| Версія  | Опис                               |
|---------|------------------------------------|
| 1.0.0   | Додано функцію `iterate()`.       |

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) — Запуск корутини
- [await_all()](/uk/docs/reference/await-all.html) — Очікування декількох корутин
- [Scope](/uk/docs/components/scope.html) — Концепція Scope
- [Cancellation](/uk/docs/components/cancellation.html) — Скасування корутин
