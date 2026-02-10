---
layout: docs
lang: ru
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /ru/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — ожидание всех задач с допуском частичных ошибок."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Ожидает завершения **всех** задач, собирая и результаты, и ошибки отдельно. Не выбрасывает исключение при ошибке отдельных задач.

## Описание

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Параметры

**`triggers`**
Iterable коллекция объектов `Async\Completable`.

**`cancellation`**
Опциональный Awaitable для отмены всего ожидания.

**`preserveKeyOrder`**
Если `true` (по умолчанию), результаты в порядке ключей входного массива. Если `false` — в порядке завершения.

**`fillNull`**
Если `true`, для задач с ошибкой в массив результатов подставляется `null`. Если `false` (по умолчанию), ключи с ошибками пропускаются.

## Возвращаемое значение

Массив из двух элементов: `[$results, $errors]`

- `$results` — массив успешных результатов
- `$errors` — массив исключений (ключи соответствуют ключам входных задач)

## Примеры

### Пример #1 Допуск частичных ошибок

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Ошибка'); }),
];

[$results, $errors] = await_all($coroutines);

// $results содержит 'fast' и 'slow'
// $errors содержит 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Задача '$key' завершилась ошибкой: {$error->getMessage()}\n";
}
?>
```

### Пример #2 С fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (вместо отсутствия ключа)
?>
```

## Примечания

> **Примечание:** Параметр `triggers` принимает любые `iterable`, включая реализации `Iterator`. Корутины могут создаваться динамически при итерации. См. [пример с Iterator](/ru/docs/reference/await-all-or-fail.html#пример-3-с-iterator-вместо-массива).

## См. также

- [await_all_or_fail()](/ru/docs/reference/await-all-or-fail.html) — все задачи, ошибка прерывает
- [await_any_or_fail()](/ru/docs/reference/await-any-or-fail.html) — первый результат
