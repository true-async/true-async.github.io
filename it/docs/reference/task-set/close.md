---
layout: docs
lang: it
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /it/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "Запечатать набор для новых задач."
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
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
    $set->close();

    try {
        $set->spawn(fn() => "ещё задача");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## См. также

- [TaskSet::cancel](/it/docs/reference/task-set/cancel.html) — Annulla tutti i task (chiama implicitamente close)
- [TaskSet::isClosed](/it/docs/reference/task-set/is-closed.html) — Проверить, запечатан ли набор
