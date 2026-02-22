---
layout: docs
lang: uk
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /uk/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — очікування перших N задач з толерантністю до часткових помилок."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Очікує завершення **перших N** задач, збираючи результати та помилки окремо. Не викидає виняток при помилці окремих задач.

## Опис

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Параметри

**`count`**
Кількість успішних результатів, яких потрібно дочекатися.

**`triggers`**
Ітерована колекція об'єктів `Async\Completable`.

**`cancellation`**
Необов'язковий Awaitable для скасування очікування.

**`preserveKeyOrder`**
Якщо `true`, ключі результатів відповідають ключам вхідного масиву.

**`fillNull`**
Якщо `true`, `null` підставляється в масив результатів для задач, що завершилися з помилкою.

## Значення, що повертаються

Масив із двох елементів: `[$results, $errors]`

- `$results` — масив успішних результатів (до `$count` елементів)
- `$errors` — масив винятків від задач, що завершилися з помилкою

## Приклади

### Приклад #1 Кворум з толерантністю до помилок

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Чекаємо кворум: 3 з 5 відповідей
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Кворум досягнуто\n";
} else {
    echo "Кворум не досягнуто, помилок: " . count($errors) . "\n";
}
?>
```

## Примітки

> **Примітка:** Параметр `triggers` приймає будь-який `iterable`, включаючи реалізації `Iterator`. Дивіться [приклад з Iterator](/uk/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Дивіться також

- [await_any_of_or_fail()](/uk/docs/reference/await-any-of-or-fail.html) — перші N, помилка перериває виконання
- [await_all()](/uk/docs/reference/await-all.html) — усі задачі з толерантністю до помилок
