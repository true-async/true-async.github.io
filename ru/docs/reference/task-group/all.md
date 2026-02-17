---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Дождаться завершения всех задач и получить массив результатов."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): array
```

Ждёт завершения текущих задач и возвращает массив результатов.
Ключи массива совпадают с ключами, заданными при `spawn()` / `spawnWithKey()`.

Если задачи уже завершены — возвращает результат немедленно.

## Параметры

**ignoreErrors**
: Если `false` (по умолчанию) и есть ошибки — бросает `CompositeException`.
  Если `true` — ошибки игнорируются, возвращаются только успешные результаты.
  Ошибки можно получить через `getErrors()`.

## Возвращаемое значение

Массив результатов, индексированный ключами задач.

## Ошибки

Бросает `Async\CompositeException`, если `$ignoreErrors = false` и хотя бы одна задача завершилась с ошибкой.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### Пример #2 Обработка ошибок

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### Пример #3 Игнорирование ошибок

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true);
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

## См. также

- [TaskGroup::awaitCompletion](/ru/docs/reference/task-group/await-completion.html) — Дождаться завершения без исключений
- [TaskGroup::getResults](/ru/docs/reference/task-group/get-results.html) — Получить результаты без ожидания
- [TaskGroup::getErrors](/ru/docs/reference/task-group/get-errors.html) — Получить ошибки
