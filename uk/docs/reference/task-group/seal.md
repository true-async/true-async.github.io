---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "Запечатати групу, щоб запобігти додаванню нових задач."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
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
    $group->seal();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## Дивіться також

- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) --- Скасувати всі задачі (неявно викликає seal)
- [TaskGroup::isSealed](/uk/docs/reference/task-group/is-sealed.html) --- Перевірити, чи група запечатана
