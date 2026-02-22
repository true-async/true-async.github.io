---
layout: docs
lang: uk
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /uk/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — очікування всіх задач з толерантністю до часткових помилок."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Очікує завершення **всіх** задач, збираючи результати та помилки окремо. Не викидає виняток при помилці окремих задач.

## Опис

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Параметри

**`triggers`**
Ітерована колекція об'єктів `Async\Completable`.

**`cancellation`**
Необов'язковий Awaitable для скасування всього очікування.

**`preserveKeyOrder`**
Якщо `true` (за замовчуванням), результати розташовані у порядку ключів вхідного масиву. Якщо `false` — у порядку завершення.

**`fillNull`**
Якщо `true`, `null` підставляється в масив результатів для задач, що завершилися з помилкою. Якщо `false` (за замовчуванням), ключі з помилками пропускаються.

## Значення, що повертаються

Масив із двох елементів: `[$results, $errors]`

- `$results` — масив успішних результатів
- `$errors` — масив винятків (ключі відповідають ключам вхідних задач)

## Приклади

### Приклад #1 Толерантність до часткових помилок

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results містить 'fast' та 'slow'
// $errors містить 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Задача '$key' не вдалася: {$error->getMessage()}\n";
}
?>
```

### Приклад #2 З fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (замість відсутнього ключа)
?>
```

## Примітки

> **Примітка:** Параметр `triggers` приймає будь-який `iterable`, включаючи реалізації `Iterator`. Корутини можна створювати динамічно під час ітерації. Дивіться [приклад з Iterator](/uk/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## Дивіться також

- [await_all_or_fail()](/uk/docs/reference/await-all-or-fail.html) — усі задачі, помилка перериває виконання
- [await_any_or_fail()](/uk/docs/reference/await-any-or-fail.html) — перший результат
