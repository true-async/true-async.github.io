---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/is-finished.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/is-finished.html
page_title: "TaskSet::isFinished"
description: "Проверить, завершены ли все задачи в наборе."
---

# TaskSet::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isFinished(): bool
```

Возвращает `true`, если нет активных корутин и очередь задач пуста.

Если набор не запечатан, это состояние может быть временным — новые задачи
могут быть добавлены через `spawn()`.

## Возвращаемое значение

`true`, если все задачи завершены. `false` в противном случае.

## Примеры

### Пример #1 Проверка состояния

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isFinished() ? "да\n" : "нет\n"; // "да"

    $set->spawn(fn() => "задача");
    echo $set->isFinished() ? "да\n" : "нет\n"; // "нет"

    $set->seal();
    $set->joinAll()->await();
    echo $set->isFinished() ? "да\n" : "нет\n"; // "да"
});
```

## См. также

- [TaskSet::isSealed](/ko/docs/reference/task-set/is-sealed.html) — Проверить, запечатан ли набор
- [TaskSet::count](/ko/docs/reference/task-set/count.html) — Количество задач
