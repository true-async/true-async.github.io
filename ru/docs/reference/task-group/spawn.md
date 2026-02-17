---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Добавить задачу в группу с автоинкрементным ключом."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Добавляет callable в группу с автоинкрементным ключом (0, 1, 2, ...).

Если лимит конкурентности не задан или есть свободный слот — корутина создаётся сразу.
Иначе callable с аргументами помещается в очередь и запускается при освобождении слота.

## Параметры

**task**
: Callable для выполнения. Принимает любой callable: Closure, функцию, метод.

**args**
: Аргументы, передаваемые в callable.

## Ошибки

Бросает `Async\AsyncException`, если группа запечатана (`seal()`) или отменена (`cancel()`).

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "первый");
    $group->spawn(fn() => "второй");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(12) "первый"
    var_dump($results[1]); // string(12) "второй"
});
```

### Пример #2 С аргументами

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## См. также

- [TaskGroup::spawnWithKey](/ru/docs/reference/task-group/spawn-with-key.html) — Добавить задачу с явным ключом
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
