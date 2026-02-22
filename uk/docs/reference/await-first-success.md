---
layout: docs
lang: uk
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /uk/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — очікування першої успішно завершеної задачі, ігноруючи помилки інших."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Очікує **першу успішно** завершену задачу. Помилки інших задач збираються окремо і не переривають очікування.

## Опис

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Параметри

**`triggers`**
Ітерована колекція об'єктів `Async\Completable`.

**`cancellation`**
Необов'язковий Awaitable для скасування очікування.

## Значення, що повертаються

Масив із двох елементів: `[$result, $errors]`

- `$result` — результат першої успішно завершеної задачі (або `null`, якщо всі задачі завершилися з помилкою)
- `$errors` — масив винятків від задач, що завершилися з помилкою до першого успіху

## Приклади

### Приклад #1 Відмовостійкий запит

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Спробувати кілька серверів; взяти першу успішну відповідь
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Дані отримано\n";
} else {
    echo "Усі сервери недоступні\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Примітки

> **Примітка:** Параметр `triggers` приймає будь-який `iterable`, включаючи реалізації `Iterator`. Дивіться [приклад з Iterator](/uk/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Дивіться також

- [await_any_or_fail()](/uk/docs/reference/await-any-or-fail.html) — перша задача, помилка перериває виконання
- [await_all()](/uk/docs/reference/await-all.html) — усі задачі з толерантністю до помилок
