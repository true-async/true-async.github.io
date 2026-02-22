---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "Отримати ітератор для обходу результатів у міру завершення задач."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

Повертає ітератор, що видає результати **у міру завершення задач**.
TaskGroup реалізує `IteratorAggregate`, тому можна використовувати `foreach` напряму.

## Поведінка ітератора

- `foreach` призупиняє поточну корутину до появи наступного результату
- Ключ відповідає тому, що призначено через `spawn()` або `spawnWithKey()`
- Значення --- масив `[mixed $result, ?Throwable $error]`:
  - Успіх: `[$result, null]`
  - Помилка: `[null, $error]`
- Ітерація завершується, коли група запечатана **і** всі задачі оброблені
- Якщо група не запечатана, `foreach` призупиняється в очікуванні нових задач

> **Важливо:** Без виклику `seal()` ітерація чекатиме нескінченно.

## Приклади

### Приклад #1 Обробка результатів у міру готовності

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
            echo "Задача $key невдала: {$error->getMessage()}\n";
            continue;
        }
        echo "Задача $key завершена\n";
    }
});
```

### Приклад #2 Ітерація з іменованими ключами

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
            echo "$key: отримано " . count($result) . " записів\n";
        }
    }
});
```

## Дивіться також

- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) --- Запечатати групу
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
- [TaskGroup::getResults](/uk/docs/reference/task-group/get-results.html) --- Отримати масив результатів
