---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "Добавить задачу в группу с явным ключом."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Добавляет callable в группу с указанным ключом.
Результат задачи будет доступен по этому ключу в `all()`, `getResults()` и при итерации.

## Параметры

**key**
: Ключ задачи. Строка или целое число. Дублирование запрещено.

**task**
: Callable для выполнения.

**args**
: Аргументы, передаваемые в callable.

## Ошибки

Бросает `Async\AsyncException`, если группа запечатана или ключ уже существует.

## Примеры

### Пример #1 Именованные задачи

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## См. также

- [TaskGroup::spawn](/ru/docs/reference/task-group/spawn.html) — Добавить задачу с автоинкрементным ключом
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
