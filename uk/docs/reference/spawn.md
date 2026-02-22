---
layout: docs
lang: uk
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /uk/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — запуск функції в новій корутині. Повна документація: параметри, значення, що повертається, приклади."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Запускає функцію для виконання в новій корутині. Створює корутину.

## Опис

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Створює та запускає нову корутину. Корутина виконуватиметься асинхронно.

## Параметри

**`callback`**
Функція або замикання для виконання в корутині. Може бути будь-яким допустимим типом callable.

**`args`**
Необов'язкові параметри, що передаються в `callback`. Параметри передаються за значенням.

## Значення, що повертаються

Повертає об'єкт `Async\Coroutine`, що представляє запущену корутину. Об'єкт можна використовувати для:
- Отримання результату через `await()`
- Скасування виконання через `cancel()`
- Перевірки стану корутини

## Приклади

### Приклад #1 Базове використання spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// Корутина виконується асинхронно
echo "Coroutine started\n";

$result = await($coroutine);
echo "Result received\n";
?>
```

### Приклад #2 Декілька корутин

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

// Усі запити виконуються конкурентно
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Downloaded: " . strlen($content) . " bytes\n";
}
?>
```

### Приклад #3 Використання із замиканням

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

### Приклад #4 spawn з Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// Чекати завершення всіх корутин у scope
$scope->awaitCompletion();
?>
```

### Приклад #5 Передача параметрів

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Sum: $result\n"; // Sum: 60
?>
```

### Приклад #6 Обробка помилок

Один зі способів обробити виняток від корутини — використати функцію `await()`:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Random error");
    }
    return "Success";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## Примітки

> **Примітка:** Корутини, створені через `spawn()`, виконуються конкурентно, але не паралельно.
> PHP TrueAsync використовує однопотокову модель виконання.

> **Примітка:** Параметри передаються в корутину за значенням.
> Для передачі за посиланням використовуйте замикання з `use (&$var)`.

## Журнал змін

| Версія   | Опис                            |
|----------|---------------------------------|
| 1.0.0    | Додано функцію `spawn()`      |

## Дивіться також

- [await()](/uk/docs/reference/await.html) — Очікування результату корутини
- [suspend()](/uk/docs/reference/suspend.html) — Призупинення виконання корутини
