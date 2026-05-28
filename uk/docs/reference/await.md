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

Якщо спрацював токен скасування (`$cancellation`), буде викинуто `Async\OperationCanceledException`. Оригінальний виняток із токена доступний через `$e->getPrevious()`. Це дозволяє відрізнити спрацювання токена від винятку самого awaitable-об'єкта.

## Як передається виняток

Коли корутина завершується з винятком, **результат «осідає» на її дескрипторі** до того часу,
поки хтось його не забере. Поведінка симетрична `Async\Future` і залежить від того, чи утримує
хтось дескриптор корутини, крім Scheduler:

- **Дескриптор утримується** (`$coro = spawn(...)`, корутина лежить у масиві, передана в
  `await_all()` тощо) — виняток зберігається на дескрипторі і чекає. Будь-який `await($coro)` його отримає,
  навіть якщо корутина вже давно завершилася.
- **Дескриптор ніхто не утримує** (fire-and-forget — `spawn(...)` без збереження результату) —
  виняток виявляється при руйнуванні handle через fire-and-forget safety net.

Головний практичний наслідок — **`await` ловить виняток навіть при гонці**:

```php
use function Async\spawn;
use function Async\await;

$coro = spawn(function () {
    throw new RuntimeException('boom');
});

// Корутина може завершитись раніше, ніж ми дійдемо до await — це нормально.
// Виняток спокійно дочекається нас тут:
try {
    await($coro);
} catch (RuntimeException $e) {
    echo "впіймав: ", $e->getMessage(), "\n"; // впіймав: boom
}
```

Те саме стосується `await_all()`, `await_any_or_fail()` та інших `await_*()`: можна зібрати корутини
в масив, дати їм попрацювати паралельно і потім дочекатися. Винятки зберуться через `await`.

> Коли parent-scope помирає раніше за свою корутину, дочірні корутини отримують `AsyncCancellation`
> за специфікацією. Ця гілка обробляється окремо і не залежить від того, хто утримує дескриптор.

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
