---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Получить итератор для обхода результатов по мере завершения задач."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Возвращает итератор, который выдаёт результаты **по мере завершения** задач.
TaskGroup реализует `IteratorAggregate`, поэтому можно использовать `foreach` напрямую.

## Поведение итератора

- `foreach` приостанавливает текущую корутину до появления следующего результата
- Ключ — тот же, что был назначен при `spawn()` или `spawnWithKey()`
- Значение — массив `[mixed $result, ?Throwable $error]`:
  - Успех: `[$result, null]`
  - Ошибка: `[null, $error]`
- Итерация завершается, когда группа запечатана **и** все задачи обработаны
- Если группа не запечатана — `foreach` приостанавливается в ожидании новых задач

> **Важно:** Без вызова `seal()` итерация будет ждать бесконечно.

## Примеры

### Пример #1 Обработка результатов по мере готовности

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Task $key failed: {$error->getMessage()}\n";
            continue;
        }
        echo "Task $key done\n";
    }
});
```

### Пример #2 Итерация с именованными ключами

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: получено " . count($result) . " записей\n";
        }
    }
});
```

## См. также

- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать группу
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
- [TaskGroup::getResults](/ru/docs/reference/task-group/get-results.html) — Получить массив результатов
