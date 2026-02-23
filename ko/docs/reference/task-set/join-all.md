---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/join-all.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/join-all.html
page_title: "TaskSet::joinAll"
description: "Дождаться всех задач и получить массив результатов с автоматической очисткой набора."
---

# TaskSet::joinAll

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::joinAll(bool $ignoreErrors = false): Async\Future
```

Возвращает `Future`, который разрешится массивом результатов, когда все задачи будут завершены.
Ключи массива совпадают с ключами, заданными при `spawn()` / `spawnWithKey()`.

**После доставки результатов все записи автоматически удаляются из набора**, и `count()` становится 0.

Если задачи уже завершены — `Future` разрешается немедленно.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`.

## Параметры

**ignoreErrors**
: Если `false` (по умолчанию) и есть ошибки — `Future` реджектится с `CompositeException`.
  Если `true` — ошибки игнорируются, `Future` разрешается только успешными результатами.

## Возвращаемое значение

`Async\Future` — будущий результат, содержащий массив результатов задач.
Для получения значения вызовите `->await()`.

## Ошибки

`Future` реджектится с `Async\CompositeException`, если `$ignoreErrors = false` и хотя бы одна задача завершилась с ошибкой.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('a', fn() => 10);
    $set->spawnWithKey('b', fn() => 20);
    $set->spawnWithKey('c', fn() => 30);

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)

    echo $set->count() . "\n"; // 0
});
```

### Пример #2 Обработка ошибок

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    try {
        $set->joinAll()->await();
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

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "ok");
    $set->spawn(fn() => throw new \RuntimeException("fail"));

    $set->seal();

    $results = $set->joinAll(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1
});
```

### Пример #4 Ожидание с таймаутом

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => slowApi()->fetchReport());
    $set->spawn(fn() => anotherApi()->fetchStats());
    $set->seal();

    try {
        $results = $set->joinAll()->await(Async\timeout(5.0));
    } catch (Async\TimeoutException) {
        echo "Не удалось получить данные за 5 секунд\n";
    }
});
```

## См. также

- [TaskSet::joinNext](/ko/docs/reference/task-set/join-next.html) — Результат первой завершившейся задачи
- [TaskSet::joinAny](/ko/docs/reference/task-set/join-any.html) — Результат первой успешной задачи
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) — Аналог без автоочистки
