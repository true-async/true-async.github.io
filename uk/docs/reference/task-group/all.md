---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "Створити Future, який повертає масив результатів усіх задач."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

Повертає `Future`, який завершується з масивом результатів, коли всі задачі виконані.
Ключі масиву відповідають ключам, призначеним через `spawn()` / `spawnWithKey()`.

Якщо задачі вже завершились, `Future` завершується негайно.

Повернений `Future` підтримує токен скасування через `await(?Completable $cancellation)`,
що дозволяє встановити тайм-аут або іншу стратегію скасування.

## Параметри

**ignoreErrors**
: Якщо `false` (за замовчуванням) і є помилки, `Future` відхиляється з `CompositeException`.
  Якщо `true`, помилки ігноруються і `Future` завершується лише з успішними результатами.
  Помилки можна отримати через `getErrors()`.

## Значення, що повертається

`Async\Future` --- майбутній результат, що містить масив результатів задач.
Викличте `->await()`, щоб отримати значення.

## Помилки

`Future` відхиляється з `Async\CompositeException`, якщо `$ignoreErrors = false` і принаймні одна задача завершилась з помилкою.

## Приклади

### Приклад #1 Базове використання

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

### Приклад #2 Обробка помилок

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

### Приклад #3 Ігнорування помилок

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

### Приклад #4 Очікування з тайм-аутом

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
        echo "Не вдалося отримати дані за 5 секунд\n";
    }
});
```

## Дивіться також

- [TaskGroup::awaitCompletion](/uk/docs/reference/task-group/await-completion.html) --- Очікування завершення без винятків
- [TaskGroup::getResults](/uk/docs/reference/task-group/get-results.html) --- Отримати результати без очікування
- [TaskGroup::getErrors](/uk/docs/reference/task-group/get-errors.html) --- Отримати помилки
