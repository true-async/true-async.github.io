---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Создать Future, который разрешится массивом результатов всех задач."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Возвращает `Future`, который разрешится массивом результатов, когда все задачи будут завершены.
Ключи массива совпадают с ключами, заданными при `spawn()` / `spawnWithKey()`.

Если задачи уже завершены — `Future` разрешается немедленно.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`,
что позволяет задать таймаут или иную стратегию отмены ожидания.

## Параметры

**ignoreErrors**
: Если `false` (по умолчанию) и есть ошибки — `Future` реджектится с `CompositeException`.
  Если `true` — ошибки игнорируются, `Future` разрешается только успешными результатами.
  Ошибки можно получить через `getErrors()`.

## Возвращаемое значение

`Async\Future` — будущий результат, содержащий массив результатов задач.
Для получения значения вызовите `->await()`.

## Ошибки

`Future` реджектится с `Async\CompositeException`, если `$ignoreErrors = false` и хотя бы одна задача завершилась с ошибкой.

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
    $results = $group->all()->await();

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
        $group->all()->await();
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

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### Пример #4 Ожидание с таймаутом

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Не удалось получить данные за 5 секунд\n";
    }
});
```

## См. также

- [TaskGroup::awaitCompletion](/ru/docs/reference/task-group/await-completion.html) — Дождаться завершения без исключений
- [TaskGroup::getResults](/ru/docs/reference/task-group/get-results.html) — Получить результаты без ожидания
- [TaskGroup::getErrors](/ru/docs/reference/task-group/get-errors.html) — Получить ошибки
