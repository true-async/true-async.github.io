---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Пометить все текущие ошибки как обработанные."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Помечает все текущие ошибки группы как обработанные.

При уничтожении TaskGroup проверяются необработанные ошибки. Если ошибки не были обработаны
(через `all()`, `foreach` или `suppressErrors()`), деструктор сигнализирует о потерянных ошибках.
Вызов `suppressErrors()` — явное подтверждение, что ошибки обработаны.

## Примеры

### Пример #1 Подавление ошибок после выборочной обработки

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // Обработать ошибки вручную
    foreach ($group->getErrors() as $key => $error) {
        log_error("Task $key: {$error->getMessage()}");
    }

    // Пометить ошибки как обработанные
    $group->suppressErrors();
});
```

## См. также

- [TaskGroup::getErrors](/ru/docs/reference/task-group/get-errors.html) — Получить массив ошибок
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
