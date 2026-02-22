---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "Отримати масив помилок з невдалих задач."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

Повертає масив винятків (`Throwable`) з задач, що завершились з помилкою.
Ключі масиву відповідають ключам задач з `spawn()` або `spawnWithKey()`.

Метод не очікує завершення задач --- він повертає лише помилки, доступні на момент виклику.

## Значення, що повертається

`array<int|string, Throwable>`, де ключ --- ідентифікатор задачі, а значення --- виняток.

## Приклади

### Приклад #1 Перегляд помилок

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

## Необроблені помилки

Якщо при знищенні TaskGroup залишаються необроблені помилки, деструктор сигналізує про це.
Помилки вважаються обробленими, якщо:

- Викликано `all()` з `ignoreErrors: false` (за замовчуванням) і кинуто `CompositeException`
- Викликано `suppressErrors()`
- Помилки оброблені через ітератор (`foreach`)

## Дивіться також

- [TaskGroup::getResults](/uk/docs/reference/task-group/get-results.html) --- Отримати масив результатів
- [TaskGroup::suppressErrors](/uk/docs/reference/task-group/suppress-errors.html) --- Позначити помилки як оброблені
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
