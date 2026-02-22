---
layout: docs
lang: uk
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /uk/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — очікування перших N успішно завершених задач."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Очікує успішного завершення **перших N** задач. Якщо одна з перших N завершується з помилкою, викидає виняток.

## Опис

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Параметри

**`count`**
Кількість успішних результатів, яких потрібно дочекатися. Якщо `0`, повертає порожній масив.

**`triggers`**
Ітерована колекція об'єктів `Async\Completable`.

**`cancellation`**
Необов'язковий Awaitable для скасування очікування.

**`preserveKeyOrder`**
Якщо `true`, ключі результатів відповідають ключам вхідного масиву. Якщо `false` — у порядку завершення.

## Значення, що повертаються

Масив із `$count` успішних результатів.

## Помилки/Винятки

Якщо задача завершується з помилкою до досягнення `$count` успіхів, виняток буде викинуто.

## Приклади

### Приклад #1 Отримання 2 з 5 результатів

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Чекаємо будь-які 2 успішні відповіді
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Примітки

> **Примітка:** Параметр `triggers` приймає будь-який `iterable`, включаючи реалізації `Iterator`. Дивіться [приклад з Iterator](/uk/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Дивіться також

- [await_any_of()](/uk/docs/reference/await-any-of.html) — перші N з толерантністю до помилок
- [await_all_or_fail()](/uk/docs/reference/await-all-or-fail.html) — усі задачі
