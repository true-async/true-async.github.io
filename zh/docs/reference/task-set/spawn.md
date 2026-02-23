---
layout: docs
lang: zh
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /zh/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Добавить задачу в набор с автоинкрементным ключом."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Добавляет callable в набор с автоинкрементным ключом (0, 1, 2, ...).

Если лимит конкурентности не задан или есть свободный слот — корутина создаётся сразу.
Иначе callable с аргументами помещается в очередь и запускается при освобождении слота.

## Параметры

**task**
: Callable для выполнения. Принимает любой callable: Closure, функцию, метод.

**args**
: Аргументы, передаваемые в callable.

## Ошибки

Бросает `Async\AsyncException`, если набор запечатан (`seal()`) или отменён (`cancel()`).

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "первый");
    $set->spawn(fn() => "второй");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(12) "первый"
    var_dump($results[1]); // string(12) "второй"
});
```

### Пример #2 С аргументами

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## См. также

- [TaskSet::spawnWithKey](/zh/docs/reference/task-set/spawn-with-key.html) — Добавить задачу с явным ключом
- [TaskSet::joinAll](/zh/docs/reference/task-set/join-all.html) — Дождаться всех задач
