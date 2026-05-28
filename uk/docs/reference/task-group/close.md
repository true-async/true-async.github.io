---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "Закрити групу, щоб запобігти додаванню нових задач."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

Запечатує групу. Будь-яка спроба використати `spawn()` або `spawnWithKey()` призведе до винятку.
Вже запущені корутини та задачі в черзі продовжують виконуватися.

Повторні виклики не мають ефекту.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->close();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## Дивіться також

- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) --- Скасувати всі задачі (неявно викликає close)
- [TaskGroup::isClosed](/uk/docs/reference/task-group/is-closed.html) --- Перевірити, чи група закрита
