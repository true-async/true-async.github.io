---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Закрыть группу для новых задач."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

Закрывает группу. Если попытаться использовать `spawn()` или `spawnWithKey()` будет выброшено исключение.
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
    $group->close();

    try {
        $group->spawn(fn() => "ещё задача");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## См. также

- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить все задачи (неявно вызывает close)
- [TaskGroup::isClosed](/ru/docs/reference/task-group/is-closed.html) — Проверить, закрыта ли группа
