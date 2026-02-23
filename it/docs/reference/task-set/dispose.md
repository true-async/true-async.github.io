---
layout: docs
lang: it
path_key: "/docs/reference/task-set/dispose.html"
nav_active: docs
permalink: /it/docs/reference/task-set/dispose.html
page_title: "TaskSet::dispose"
description: "Уничтожить scope набора задач."
---

# TaskSet::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::dispose(): void
```

Уничтожает scope набора, отменяя все корутины. После вызова набор полностью недоступен.

## Примеры

### Пример #1 Уничтожение набора

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => longRunningTask());
    $set->dispose();
});
```

## См. также

- [TaskSet::cancel](/it/docs/reference/task-set/cancel.html) — Отменить задачи
- [TaskSet::seal](/it/docs/reference/task-set/seal.html) — Запечатать набор
