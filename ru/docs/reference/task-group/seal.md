---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Запечатать группу для новых задач."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

Запечатывает группу. Если попытаться использовать `spawn()` или `spawnWithKey()` будет выброшено исключение.
Уже запущенные корутины и задачи в очереди продолжают работать.

Повторный вызов — noop.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "задача");
    $group->seal();

    try {
        $group->spawn(fn() => "ещё задача");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## См. также

- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить все задачи (неявно вызывает seal)
- [TaskGroup::isSealed](/ru/docs/reference/task-group/is-sealed.html) — Проверить, запечатана ли группа
