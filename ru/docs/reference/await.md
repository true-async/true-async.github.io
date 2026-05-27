---
layout: docs
lang: ru
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /ru/docs/reference/await.html
page_title: "await()"
description: "await() — ожидание завершения корутины или Future. Полная документация: параметры, исключения, примеры."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — Ожидает завершения корутины, `Async\Future` или любого другого `Async\Completable`.
Возвращает результат или выбрасывает исключение.

## Описание

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

Приостанавливает выполнение текущей корутины до завершения указанного `Async\Completable` `$awaitable` (или до наступления `$cancellation`, если он указан) и возвращает результат.
Если `awaitable` уже завершён, результат возвращается немедленно.

Если корутина завершилась с исключением, оно будет пробрасываться вызывающему коду.

## Параметры

**`awaitable`**
Объект, реализующий интерфейс `Async\Completable` (расширяет `Async\Awaitable`). Обычно это:
- `Async\Coroutine` - результат вызова `spawn()`
- `Async\TaskGroup` - группа задач
- `Async\Future` - будущее значение

**`cancellation`**
Опциональный объект `Async\Completable`, при выполнении которого ожидание будет отменено.

## Возвращаемое значение

Возвращает значение, которое вернула корутина. Тип возвращаемого значения зависит от корутины.

## Ошибки/Исключения

Если корутина завершилась с исключением, `await()` пробросит это исключение.

Если корутина была отменена, будет выброшено `Async\AsyncCancellation`.

Если сработал токен отмены (`$cancellation`), будет выброшено `Async\OperationCanceledException`. Оригинальное исключение из токена доступно через `$e->getPrevious()`. Это позволяет отличить срабатывание токена от исключения самого awaitable-объекта.

## Семантика исключений в корутинах (изменено в 0.7.0)

> **Важно:** начиная с **TrueAsync ext-async 0.7.0** (см. [issue #139](https://github.com/true-async/php-src/issues/139))
> семантика исключений у корутин была приведена к Future-style.

Если корутина завершается с исключением, оно **не пробрасывается мгновенно в родителя**.
Вместо этого исключение **хранится на самой корутине** и всплывает в одной из двух ситуаций:

1. **Через `await($coroutine)`** — исключение получает первый `await` (или последующие — оно
   replay'ится). Это нормальный путь и единственное надёжное место его перехватить.
2. **Через safety-net при уничтожении handle** — если handle корутины разрушается, а исключение
   так и осталось неувиденным, оно проявляется в этот момент (fire-and-forget safety net).
   Это срабатывает только тогда, когда никто больше не сможет его наблюдать: `refcount ≤ 1`
   или это `{main}`-frame.

### Зачем это нужно

В версиях до 0.7.0 был баг: если корутина бросала исключение, а awaiter ещё не подписался,
исключение **сразу пробрасывалось в родительский фрейм** и **одновременно** оставалось на handle.
Когда последующий `await($coro)` его replay'ил — catch срабатывал на replay'е, но первая копия
всплывала как `Uncaught Fatal` после раскрутки catch'а. Двойной throw.

Теперь поведение симметрично `Async\Future`: исключение «парит» на корутине, пока его не возьмут.

### Что это означает на практике

- **Если вы планируете `await()` на корутине** — ничего не изменилось. Просто оборачивайте в
  `try/catch` как обычно.
- **Если вы spawn'ите fire-and-forget корутину**, и она может бросить — лучше
  поставить `finally()` или поймать `Throwable` внутри самой корутины. Иначе исключение всё равно
  всплывёт (в момент destruction handle), но **в неудобном месте** — в фоновом моменте, без
  привязки к конкретной строке кода-родителя.
- **Если корутина наблюдалась через `EXC_CAUGHT`** (`await` уже был сделан или `catch`-сработал) —
  safety-net не сработает. Sticky-флаг `EXC_CAUGHT` снимает обязанность.

### Гарантия для отменённых scope'ов

Когда parent-scope умирает раньше своей корутины, дочерние корутины получают `AsyncCancellation`
(по спецификации). Эта ветка обрабатывается отдельно и **не зависит** от refcount-эвристики —
поэтому safety-net не может ошибочно сработать на отменённой корутине без awaiter'а.

## Примеры

### Пример #1 Базовое использование await()

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

### Пример #2 Последовательное ожидание

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

echo "Пользователь: {$user['name']}\n";
echo "Постов: " . count($posts) . "\n";
?>
```

### Пример #3 Обработка исключений

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Не удалось загрузить данные");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Данные получены\n";
} catch (RuntimeException $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
}
?>
```

### Пример #4 await с TaskGroup

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Результат 1";
});

$taskGroup->spawn(function() {
    return "Результат 2";
});

$taskGroup->spawn(function() {
    return "Результат 3";
});

// Получаем массив всех результатов
$results = await($taskGroup);
print_r($results); // Массив результатов
?>
```

### Пример #5 Множественные await на одной корутине

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Готово";
});

// Первый await дождётся результата
$result1 = await($coroutine);
echo "$result1\n";

// Последующие await вернут результат мгновенно
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### Пример #6 await внутри корутины

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Родительская корутина запущена\n";

    $child = spawn(function() {
        echo "Дочерняя корутина работает\n";
        Async\sleep(1000);
        return "Результат от дочерней";
    });

    echo "Ожидаем дочернюю...\n";
    $result = await($child);
    echo "Получили: $result\n";
});

echo "Основной код продолжается\n";
?>
```

## Changelog

| Версия   | Описание                    |
|----------|-----------------------------|
| 0.7.0    | `await($coroutine)`: исключение больше не пробрасывается мгновенно в родителя — Future-style семантика с EXC_CAUGHT и fire-and-forget safety net (issue #139). Устранён double-throw на late-await. |
| 1.0.0    | Добавлена функция `await()` |

## См. также

- [spawn()](/ru/docs/reference/spawn.html) - Запуск корутины
- [suspend()](/ru/docs/reference/suspend.html) - Приостановка выполнения
