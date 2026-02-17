---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "Получить общее количество задач в группе."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

Возвращает общее количество задач в группе: в очереди, запущенных и завершённых.

TaskGroup реализует интерфейс `Countable`, поэтому можно использовать `count($group)`.

## Возвращаемые значения

Общее количество задач (`int`).

## Примеры

### Пример #1 Подсчёт задач

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

## См. также

- [TaskGroup::isFinished](/ru/docs/reference/task-group/is-finished.html) — Проверить, завершены ли все задачи
- [TaskGroup::isSealed](/ru/docs/reference/task-group/is-sealed.html) — Проверить, запечатана ли группа
