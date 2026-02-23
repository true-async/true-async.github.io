---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/is-sealed.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/is-sealed.html
page_title: "TaskSet::isSealed"
description: "Проверить, запечатан ли набор."
---

# TaskSet::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isSealed(): bool
```

Возвращает `true`, если набор запечатан (вызван `seal()` или `cancel()`).

## Возвращаемое значение

`true`, если набор запечатан. `false` в противном случае.

## Примеры

### Пример #1 Проверка состояния

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isSealed() ? "да\n" : "нет\n"; // "нет"

    $set->seal();
    echo $set->isSealed() ? "да\n" : "нет\n"; // "да"
});
```

## См. также

- [TaskSet::seal](/ko/docs/reference/task-set/seal.html) — Запечатать набор
- [TaskSet::isFinished](/ko/docs/reference/task-set/is-finished.html) — Проверить, завершены ли задачи
