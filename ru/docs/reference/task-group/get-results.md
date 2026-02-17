---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "Получить массив результатов завершённых задач."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

Возвращает массив результатов успешно завершённых задач.
Ключи массива совпадают с ключами, назначенными при `spawn()` (автоинкремент) или `spawnWithKey()` (пользовательские).

Метод не ожидает завершения задач — возвращает только те результаты, которые уже доступны на момент вызова.

## Возвращаемые значения

Массив `array<int|string, mixed>`, где ключ — идентификатор задачи, значение — результат выполнения.

## Примеры

### Пример #1 Получение результатов после all()

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

### Пример #2 Результаты не содержат ошибок

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

## См. также

- [TaskGroup::getErrors](/ru/docs/reference/task-group/get-errors.html) — Получить массив ошибок
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач
- [TaskGroup::suppressErrors](/ru/docs/reference/task-group/suppress-errors.html) — Пометить ошибки как обработанные
