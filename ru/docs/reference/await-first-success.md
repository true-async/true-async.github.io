---
layout: docs
lang: ru
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /ru/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — ожидание первой успешно завершившейся задачи, игнорируя ошибки других."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Ожидает **первую успешно** завершившуюся задачу. Ошибки других задач собираются отдельно, а не прерывают ожидание.

## Описание

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Параметры

**`triggers`**
Iterable коллекция объектов `Async\Completable`.

**`cancellation`**
Опциональный Awaitable для отмены ожидания.

## Возвращаемое значение

Массив из двух элементов: `[$result, $errors]`

- `$result` — результат первой успешно завершившейся задачи (или `null`, если все завершились с ошибкой)
- `$errors` — массив исключений от задач, завершившихся до первого успеха

## Примеры

### Пример #1 Отказоустойчивый запрос

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Пробуем несколько серверов; первый успешный ответ — берём
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Получены данные\n";
} else {
    echo "Все серверы недоступны\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Примечания

> **Примечание:** Параметр `triggers` принимает любые `iterable`, включая реализации `Iterator`. См. [пример с Iterator](/ru/docs/reference/await-all-or-fail.html#пример-3-с-iterator-вместо-массива).

## См. также

- [await_any_or_fail()](/ru/docs/reference/await-any-or-fail.html) — первая задача, ошибка прерывает
- [await_all()](/ru/docs/reference/await-all.html) — все задачи с допуском ошибок
