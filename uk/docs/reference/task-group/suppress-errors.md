---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "Позначити всі поточні помилки як оброблені."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

Позначає всі поточні помилки в групі як оброблені.

Коли TaskGroup знищується, вона перевіряє наявність необроблених помилок. Якщо помилки не були оброблені
(через `all()`, `foreach` або `suppressErrors()`), деструктор сигналізує про втрачені помилки.
Виклик `suppressErrors()` --- це явне підтвердження, що помилки оброблені.

## Приклади

### Приклад #1 Придушення помилок після вибіркової обробки

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

    // Обробляємо помилки вручну
    foreach ($group->getErrors() as $key => $error) {
        log_error("Task $key: {$error->getMessage()}");
    }

    // Позначаємо помилки як оброблені
    $group->suppressErrors();
});
```

## Дивіться також

- [TaskGroup::getErrors](/uk/docs/reference/task-group/get-errors.html) --- Отримати масив помилок
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
