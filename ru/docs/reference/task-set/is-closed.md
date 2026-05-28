---
layout: docs
lang: ru
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "Проверить, закрыт ли набор."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

Возвращает `true`, если набор закрыт (вызван `close()` или `cancel()`).

## Возвращаемое значение

`true`, если набор закрыт. `false` в противном случае.

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

- [TaskSet::close](/ru/docs/reference/task-set/close.html) — Закрыть набор
- [TaskSet::isFinished](/ru/docs/reference/task-set/is-finished.html) — Проверить, завершены ли задачи
