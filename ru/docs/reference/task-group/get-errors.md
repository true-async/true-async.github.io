---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Получить массив ошибок упавших задач."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Возвращает массив исключений (`Throwable`) из задач, завершившихся с ошибкой.
Ключи массива совпадают с ключами задач при `spawn()` или `spawnWithKey()`.

Метод не ожидает завершения задач — возвращает только ошибки, доступные на момент вызова.

## Возвращаемые значения

Массив `array<int|string, Throwable>`, где ключ — идентификатор задачи, значение — исключение.

## Примеры

### Пример #1 Просмотр ошибок

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## Необработанные ошибки

Если при уничтожении TaskGroup остаются необработанные ошибки — деструктор сигнализирует об этом.
Ошибки считаются обработанными, если:

- `all()` вызван с `ignoreErrors: false` (по умолчанию) и бросил `CompositeException`
- Вызван `suppressErrors()`
- Ошибки обработаны через итератор (`foreach`)

## См. также

- [TaskGroup::getResults](/ru/docs/reference/task-group/get-results.html) — Получить массив результатов
- [TaskGroup::suppressErrors](/ru/docs/reference/task-group/suppress-errors.html) — Пометить ошибки как обработанные
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
