---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Отримати масив результатів завершених задач."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Повертає масив результатів успішно завершених задач.
Ключі масиву відповідають ключам, призначеним через `spawn()` (автоінкремент) або `spawnWithKey()` (користувацький).

Метод не очікує завершення задач --- він повертає лише результати, доступні на момент виклику.

## Значення, що повертається

`array<int|string, mixed>`, де ключ --- ідентифікатор задачі, а значення --- результат виконання.

## Приклади

### Приклад #1 Отримання результатів після all()

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### Приклад #2 Результати не містять помилок

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## Дивіться також

- [TaskGroup::getErrors](/uk/docs/reference/task-group/get-errors.html) --- Отримати масив помилок
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
- [TaskGroup::suppressErrors](/uk/docs/reference/task-group/suppress-errors.html) --- Позначити помилки як оброблені
