---
layout: docs
lang: uk
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "Проверить, запечатан ли набор."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

Возвращает `true`, если набор запечатан (вызван `close()` или `cancel()`).

## Возвращаемое значение

`true`, если набор запечатан. `false` в противном случае.

## Примеры

### Пример #1 Проверка состояния

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "да\n" : "нет\n"; // "нет"

    $set->close();
    echo $set->isClosed() ? "да\n" : "нет\n"; // "да"
});
```

## См. также

- [TaskSet::close](/uk/docs/reference/task-set/close.html) — Запечатать набор
- [TaskSet::isFinished](/uk/docs/reference/task-set/is-finished.html) — Проверить, завершены ли задачи
