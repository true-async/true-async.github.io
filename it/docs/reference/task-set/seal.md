---
layout: docs
lang: it
path_key: "/docs/reference/task-set/seal.html"
nav_active: docs
permalink: /it/docs/reference/task-set/seal.html
page_title: "TaskSet::seal"
description: "Запечатать набор для новых задач."
---

# TaskSet::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::seal(): void
```

Запечатывает набор. После этого `spawn()` и `spawnWithKey()` бросают исключение.
Уже запущенные корутины и задачи в очереди продолжают работать.

Повторный вызов — noop.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "задача");
    $set->seal();

    try {
        $set->spawn(fn() => "ещё задача");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## См. также

- [TaskSet::cancel](/it/docs/reference/task-set/cancel.html) — Отменить все задачи (неявно вызывает seal)
- [TaskSet::isSealed](/it/docs/reference/task-set/is-sealed.html) — Проверить, запечатан ли набор
