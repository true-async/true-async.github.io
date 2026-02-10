---
layout: docs
lang: ru
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /ru/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — ожидание первых N задач с допуском частичных ошибок."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Ожидает завершения **первых N** задач, собирая результаты и ошибки отдельно. Не выбрасывает исключение при ошибке отдельных задач.

## Описание

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Параметры

**`count`**
Количество успешных результатов, которое нужно дождаться.

**`triggers`**
Iterable коллекция объектов `Async\Completable`.

**`cancellation`**
Опциональный Awaitable для отмены ожидания.

**`preserveKeyOrder`**
Если `true`, ключи результатов соответствуют ключам входного массива.

**`fillNull`**
Если `true`, для задач с ошибкой в массив результатов подставляется `null`.

## Возвращаемое значение

Массив из двух элементов: `[$results, $errors]`

- `$results` — массив успешных результатов (до `$count` штук)
- `$errors` — массив исключений от задач, завершившихся с ошибкой

## Примеры

### Пример #1 Кворум с допуском ошибок

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Ждём кворум: 3 из 5 ответов
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Кворум достигнут\n";
} else {
    echo "Кворум не достигнут, ошибок: " . count($errors) . "\n";
}
?>
```

## Примечания

> **Примечание:** Параметр `triggers` принимает любые `iterable`, включая реализации `Iterator`. См. [пример с Iterator](/ru/docs/reference/await-all-or-fail.html#пример-3-с-iterator-вместо-массива).

## См. также

- [await_any_of_or_fail()](/ru/docs/reference/await-any-of-or-fail.html) — первые N, ошибка прерывает
- [await_all()](/ru/docs/reference/await-all.html) — все задачи с допуском ошибок
