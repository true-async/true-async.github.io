---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/count.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/count.html
page_title: "TaskSet::count"
description: "Получить количество задач, ещё не доставленных потребителю."
---

# TaskSet::count

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::count(): int
```

Возвращает количество задач, которые ещё не были доставлены потребителю.

В отличие от `TaskGroup::count()`, который возвращает общее число задач,
`TaskSet::count()` уменьшается при каждой доставке результата через
`joinNext()`, `joinAny()`, `joinAll()` или `foreach`.

`TaskSet` реализует `Countable`, поэтому можно использовать `count($set)`.

## Возвращаемое значение

Количество задач в наборе.

## Примеры

### Пример #1 Отслеживание прогресса

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");
    $set->spawn(fn() => "c");

    echo $set->count() . "\n"; // 3

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 2

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 1

    $set->joinNext()->await();
    echo $set->count() . "\n"; // 0
});
```

## См. также

- [TaskSet::isFinished](/ko/docs/reference/task-set/is-finished.html) — Проверить, завершены ли все задачи
- [TaskSet::joinNext](/ko/docs/reference/task-set/join-next.html) — Получить следующий результат
