---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Отримати загальну кількість задач у групі."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Повертає загальну кількість задач у групі: у черзі, запущених і завершених.

TaskGroup реалізує інтерфейс `Countable`, тому можна використовувати `count($group)`.

## Значення, що повертається

Загальна кількість задач (`int`).

## Приклади

### Приклад #1 Підрахунок задач

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## Дивіться також

- [TaskGroup::isFinished](/uk/docs/reference/task-group/is-finished.html) --- Перевірити, чи всі задачі завершені
- [TaskGroup::isSealed](/uk/docs/reference/task-group/is-sealed.html) --- Перевірити, чи група запечатана
