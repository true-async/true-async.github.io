---
layout: docs
lang: ru
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /ru/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — ожидание первой успешно завершившейся задачи."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Ожидает завершения **первой** задачи. Если первая завершившаяся задача выбросила исключение — оно пробрасывается.

## Описание

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Параметры

**`triggers`**
Iterable коллекция объектов `Async\Completable`.

**`cancellation`**
Опциональный Awaitable для отмены ожидания.

## Возвращаемое значение

Результат первой завершившейся задачи.

## Ошибки/Исключения

Если первая завершившаяся задача выбросила исключение, оно будет проброшено.

## Примеры

### Пример #1 Гонка запросов

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Кто быстрее ответит — тот и выиграл
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Получен ответ от самого быстрого зеркала\n";
?>
```

## Примечания

> **Примечание:** Параметр `triggers` принимает любые `iterable`, включая реализации `Iterator`. См. [пример с Iterator](/ru/docs/reference/await-all-or-fail.html#пример-3-с-iterator-вместо-массива).

## См. также

- [await_first_success()](/ru/docs/reference/await-first-success.html) — первый успешный, игнорируя ошибки
- [await_all_or_fail()](/ru/docs/reference/await-all-or-fail.html) — все задачи
