---
layout: docs
lang: ru
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /ru/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — запуск функции в новой корутине. Полная документация: параметры, возвращаемое значение, примеры."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Запускает выполнение функции в новой корутине. Создаёт корутину.

## Описание

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Создаёт и запускает новую корутину. Корутина будет выполнена асинхронно.

## Параметры

**`callback`**
Функция или замыкание для выполнения в корутине. Может быть любым валидным callable типом.

**`args`**
Необязательные параметры, передаваемые в `callback`. Параметры передаются по значению.

## Возвращаемое значение

Возвращает объект `Async\Coroutine`, представляющий запущенную корутину. Объект можно использовать для:
- Получения результата через `await()`
- Отмены выполнения через `cancel()`
- Проверки состояния корутины

## Примеры

### Пример #1 Базовое использование spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// Корутина выполняется асинхронно
echo "Корутина запущена\n";

$result = await($coroutine);
echo "Результат получен\n";
?>
```

### Пример #2 Множественные корутины

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// Все запросы выполняются конкурентно
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Загружено: " . strlen($content) . " байт\n";
}
?>
```

### Пример #3 Использование с замыканием

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Пример #4 spawn с Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Корутина 1\n";
});

$scope->spawn(function() {
    echo "Корутина 2\n";
});

// Ожидаем завершения всех корутин в scope
$scope->awaitCompletion();
?>
```

### Пример #5 Передача параметров

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Сумма: $result\n"; // Сумма: 60
?>
```

### Пример #6 Обработка ошибок

Один из способов обработать исключение из корутины, использовать функцию `await()`:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Случайная ошибка");
    }
    return "Успех";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Ошибка: " . $e->getMessage();
}
?>
```

## Примечания

> **Примечание:** Корутины, созданные через `spawn()`, выполняются конкурентно, но не параллельно.
> PHP TrueAsync использует однопоточную модель выполнения.

> **Примечание:** Параметры передаются в корутину по значению.
> Для передачи по ссылке используйте замыкание с `use (&$var)`.

## Changelog

| Версия   | Описание                    |
|----------|-----------------------------|
| 1.0.0    | Добавлена функция `spawn()` |

## См. также

- [await()](/ru/docs/reference/await.html) - Ожидание результата корутины
- [suspend()](/ru/docs/reference/suspend.html) - Приостановка выполнения корутины
