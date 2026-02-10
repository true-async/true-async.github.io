---
layout: docs
lang: ru
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /ru/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — ожидание первых N успешно завершившихся задач."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Ожидает успешного завершения **первых N** задач. При ошибке в одной из первых N — выбрасывает исключение.

## Описание

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Параметры

**`count`**
Количество успешных результатов, которое нужно дождаться. Если `0` — возвращает пустой массив.

**`triggers`**
Iterable коллекция объектов `Async\Completable`.

**`cancellation`**
Опциональный Awaitable для отмены ожидания.

**`preserveKeyOrder`**
Если `true`, ключи результатов соответствуют ключам входного массива. Если `false` — в порядке завершения.

## Возвращаемое значение

Массив из `$count` успешных результатов.

## Ошибки/Исключения

Если одна из задач завершается с ошибкой до достижения `$count` успешных — выбрасывает исключение.

## Примеры

### Пример #1 Получение 2 из 5 результатов

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Ждём любые 2 успешных ответа
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Примечания

> **Примечание:** Параметр `triggers` принимает любые `iterable`, включая реализации `Iterator`. См. [пример с Iterator](/ru/docs/reference/await-all-or-fail.html#пример-3-с-iterator-вместо-массива).

## См. также

- [await_any_of()](/ru/docs/reference/await-any-of.html) — первые N с допуском ошибок
- [await_all_or_fail()](/ru/docs/reference/await-all-or-fail.html) — все задачи
