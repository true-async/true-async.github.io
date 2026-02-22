---
layout: docs
lang: uk
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /uk/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — очікування першої завершеної задачі."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Очікує завершення **першої** задачі. Якщо перша завершена задача викинула виняток, він буде переданий далі.

## Опис

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Параметри

**`triggers`**
Ітерована колекція об'єктів `Async\Completable`.

**`cancellation`**
Необов'язковий Awaitable для скасування очікування.

## Значення, що повертаються

Результат першої завершеної задачі.

## Помилки/Винятки

Якщо перша завершена задача викинула виняток, він буде переданий далі.

## Приклади

### Приклад #1 Перегони запитів

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Хто відповість першим — той і виграв
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Отримано відповідь від найшвидшого дзеркала\n";
?>
```

## Примітки

> **Примітка:** Параметр `triggers` приймає будь-який `iterable`, включаючи реалізації `Iterator`. Дивіться [приклад з Iterator](/uk/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Дивіться також

- [await_first_success()](/uk/docs/reference/await-first-success.html) — перший успіх, ігноруючи помилки
- [await_all_or_fail()](/uk/docs/reference/await-all-or-fail.html) — усі задачі
