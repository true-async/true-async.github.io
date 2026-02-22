---
layout: docs
lang: uk
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /uk/docs/reference/await.html
page_title: "await()"
description: "await() — очікування завершення корутини або Future. Повна документація: параметри, винятки, приклади."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Очікує завершення корутини, `Async\Future` або будь-якого іншого `Async\Completable`.
Повертає результат або викидає виняток.

## Опис

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Призупиняє виконання поточної корутини до завершення вказаного `Async\Completable` `$awaitable` (або до спрацювання `$cancellation`, якщо він наданий) і повертає результат.
Якщо `awaitable` вже завершено, результат повертається негайно.

Якщо корутина завершилася з винятком, він буде переданий у викликаючий код.

## Параметри

**`awaitable`**
Об'єкт, що реалізує інтерфейс `Async\Completable` (розширює `Async\Awaitable`). Зазвичай це:
- `Async\Coroutine` — результат виклику `spawn()`
- `Async\TaskGroup` — група задач
- `Async\Future` — майбутнє значення

**`cancellation`**
Необов'язковий об'єкт `Async\Completable`; коли він завершується, очікування буде скасовано.

## Значення, що повертаються

Повертає значення, яке повернула корутина. Тип повертаного значення залежить від корутини.

## Помилки/Винятки

Якщо корутина завершилася з винятком, `await()` повторно викине цей виняток.

Якщо корутину було скасовано, буде викинуто `Async\AsyncCancellation`.

## Приклади

### Приклад #1 Базове використання await()

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### Приклад #2 Послідовне очікування

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### Приклад #3 Обробка винятків

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Failed to fetch data");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Data received\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### Приклад #4 await з TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// Отримати масив усіх результатів
$results = await($taskGroup);
print_r($results); // Масив результатів
?>
```

### Приклад #5 Декілька await для тієї самої корутини

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// Перший await чекатиме на результат
$result1 = await($coroutine);
echo "$result1\n";

// Наступні await повертають результат миттєво
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Приклад #6 await всередині корутини

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Parent coroutine started\n";

    $child = spawn(function() {
        echo "Child coroutine running\n";
        Async\sleep(1000);
        return "Result from child";
    });

    echo "Waiting for child...\n";
    $result = await($child);
    echo "Received: $result\n";
});

echo "Main code continues\n";
?>
```

## Журнал змін

| Версія   | Опис                            |
|----------|---------------------------------|
| 1.0.0    | Додано функцію `await()`       |

## Дивіться також

- [spawn()](/uk/docs/reference/spawn.html) — Запуск корутини
- [suspend()](/uk/docs/reference/suspend.html) — Призупинення виконання
