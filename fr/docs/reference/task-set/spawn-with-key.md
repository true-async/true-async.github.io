---
layout: docs
lang: fr
path_key: "/docs/reference/task-set/spawn-with-key.html"
nav_active: docs
permalink: /fr/docs/reference/task-set/spawn-with-key.html
page_title: "TaskSet::spawnWithKey"
description: "Добавить задачу в набор с явным ключом."
---

# TaskSet::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

Добавляет callable в набор с заданным ключом. Ключ используется в массиве результатов
и при итерации через `foreach`.

## Параметры

**key**
: Ключ результата. Должен быть уникальным в пределах набора.

**task**
: Callable для выполнения.

**args**
: Аргументы, передаваемые в callable.

## Ошибки

- Бросает `Async\AsyncException`, если набор запечатан или отменён.
- Бросает `Async\AsyncException`, если ключ уже используется.

## Примеры

### Пример #1 Именованные задачи

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('user',   fn() => fetchUser($id));
    $set->spawnWithKey('orders', fn() => fetchOrders($id));

    $set->seal();
    $data = $set->joinAll()->await();

    echo $data['user']['name'];
    echo count($data['orders']);
});
```

## См. также

- [TaskSet::spawn](/fr/docs/reference/task-set/spawn.html) — Добавить задачу с автоключом
- [TaskSet::joinAll](/fr/docs/reference/task-set/join-all.html) — Дождаться всех задач
