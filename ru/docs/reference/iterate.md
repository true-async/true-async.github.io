---
layout: docs
lang: ru
path_key: "/docs/reference/iterate.html"
nav_active: docs
permalink: /ru/docs/reference/iterate.html
page_title: "iterate()"
description: "iterate() — конкурентная итерация по массиву или Traversable с управлением параллельностью и жизненным циклом порождённых корутин."
---

# iterate

(PHP 8.6+, True Async 1.0.0)

`iterate()` — Конкурентно итерирует по массиву или `Traversable`, вызывая `callback` для каждого элемента.

## Описание

```php
iterate(iterable $iterable, callable $callback, int $concurrency = 0, bool $cancelPending = true): void
```

Выполняет `callback` для каждого элемента `iterable` в отдельной корутине.
Параметр `concurrency` позволяет ограничить количество одновременно выполняемых callback-ов.
Функция блокирует текущую корутину до завершения всех итераций.

Все корутины, порождённые через `iterate()`, выполняются в изолированном дочернем `Scope`.

## Параметры

**`iterable`**
Массив или объект, реализующий `Traversable` (включая генераторы и `ArrayIterator`).

**`callback`**
Функция, вызываемая для каждого элемента. Принимает два аргумента: `(mixed $value, mixed $key)`.
Если callback возвращает `false`, итерация прекращается.

**`concurrency`**
Максимальное количество одновременно выполняемых callback-ов. По умолчанию `0` — ограничение по-умолчанию,
все элементы обрабатываются конкурентно. Значение `1` означает выполнение в одной корутине.

**`cancelPending`**
Управляет поведением дочерних корутин, порождённых внутри callback-а (через `spawn()`), после завершения итерации.
- `true` (по умолчанию) — все незавершённые порождённые корутины отменяются с `AsyncCancellation`.
- `false` — `iterate()` ожидает завершения всех порождённых корутин перед возвратом.

## Возвращаемое значение

Функция не возвращает значения.

## Ошибки/Исключения

- `Error` — если вызвана вне асинхронного контекста или из контекста планировщика.
- `TypeError` — если `iterable` не является массивом и не реализует `Traversable`.
- Если callback выбрасывает исключение, итерация прекращается, оставшиеся корутины отменяются, и исключение пробрасывается вызывающему коду.

## Примеры

### Пример #1 Базовая итерация по массиву

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
        echo "$name: " . strlen($content) . " байт\n";
    });

    echo "Все запросы завершены\n";
});
?>
```

### Пример #2 Ограничение конкурентности

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $userIds = range(1, 100);

    // Обрабатываем не более 10 пользователей одновременно
    iterate($userIds, function(int $userId) {
        $data = file_get_contents("https://api.example.com/users/$userId");
        echo "Пользователь $userId загружен\n";
    }, concurrency: 10);

    echo "Все пользователи обработаны\n";
});
?>
```

### Пример #3 Остановка итерации по условию

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    iterate($items, function(string $item) {
        echo "Обработка: $item\n";

        if ($item === 'cherry') {
            return false; // Остановить итерацию
        }
    });

    echo "Итерация завершена\n";
});
?>
```

**Результат:**
```
Обработка: apple
Обработка: banana
Обработка: cherry
Итерация завершена
```

### Пример #4 Итерация по генератору

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
        echo "$key: обработка значения $value\n";
    }, concurrency: 2);

    echo "Все задачи завершены\n";
});
?>
```

### Пример #5 Отмена порождённых корутин (cancelPending = true)

По умолчанию корутины, порождённые через `spawn()` внутри callback-а, отменяются после завершения итерации:

```php
<?php
use function Async\spawn;
use function Async\iterate;
use Async\AsyncCancellation;

spawn(function() {
    iterate([1, 2, 3], function(int $value) {
        // Порождаем фоновую задачу
        spawn(function() use ($value) {
            try {
                echo "Фоновая задача $value запущена\n";
                suspend();
                suspend();
                echo "Фоновая задача $value завершена\n"; // Не выполнится
            } catch (AsyncCancellation) {
                echo "Фоновая задача $value отменена\n";
            }
        });
    });

    echo "Итерация завершена\n";
});
?>
```

**Результат:**
```
Фоновая задача 1 запущена
Фоновая задача 2 запущена
Фоновая задача 3 запущена
Фоновая задача 1 отменена
Фоновая задача 2 отменена
Фоновая задача 3 отменена
Итерация завершена
```

### Пример #6 Ожидание порождённых корутин (cancelPending = false)

Если передать `cancelPending: false`, `iterate()` дождётся завершения всех порождённых корутин:

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    $results = [];

    iterate([1, 2, 3], function(int $value) use (&$results) {
        // Порождаем фоновую задачу
        spawn(function() use (&$results, $value) {
            suspend();
            $results[] = "результат-$value";
        });
    }, cancelPending: false);

    // Все фоновые задачи завершены
    sort($results);
    echo implode(', ', $results) . "\n";
});
?>
```

**Результат:**
```
результат-1, результат-2, результат-3
```

### Пример #7 Обработка ошибок

```php
<?php
use function Async\spawn;
use function Async\iterate;

spawn(function() {
    try {
        iterate([1, 2, 3, 4, 5], function(int $value) {
            if ($value === 3) {
                throw new RuntimeException("Ошибка при обработке элемента $value");
            }
            echo "Обработан: $value\n";
        });
    } catch (RuntimeException $e) {
        echo "Поймано: " . $e->getMessage() . "\n";
    }
});
?>
```

## Примечания

> **Примечание:** `iterate()` создаёт изолированный дочерний Scope для всех порождённых корутин.

> **Примечание:** При передаче массива `iterate()` создаёт его копию перед итерацией.
> Модификация исходного массива внутри callback-а не влияет на итерацию.

> **Примечание:** Если `callback` возвращает `false`, итерация прекращается,
> но уже запущенные корутины продолжают работу до завершения (или отмены, если `cancelPending = true`).

## Changelog

| Версия | Описание                       |
|--------|--------------------------------|
| 1.0.0  | Добавлена функция `iterate()`. |

## См. также

- [spawn()](/ru/docs/reference/spawn.html) - Запуск корутины
- [await_all()](/ru/docs/reference/await-all.html) - Ожидание нескольких корутин
- [Scope](/ru/docs/concepts/scope.html) - Концепция Scope
- [Отмена](/ru/docs/concepts/cancellation.html) - Отмена корутин
