---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Создать Future, который разрешится результатом первой завершившейся задачи."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Возвращает `Future`, который разрешится результатом первой завершившейся задачи — успешной или с ошибкой.
Если задача завершилась с ошибкой, `Future` реджектится с этим исключением.
Остальные задачи **продолжают работать**.

Если уже есть завершённая задача — `Future` разрешается немедленно.

Возвращённый `Future` поддерживает токен отмены через `await(?Completable $cancellation)`.

## Возвращаемое значение

`Async\Future` — будущий результат первой завершившейся задачи.
Для получения значения вызовите `->await()`.

## Ошибки

- Бросает `Async\AsyncException`, если группа пуста.
- `Future` реджектится с исключением задачи, если первая завершившаяся задача упала с ошибкой.

## Примеры

### Пример #1 Первый ответ

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### Пример #2 Hedged requests с таймаутом

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Ни одна реплика не ответила за 2 секунды\n";
    }
});
```

## См. также

- [TaskGroup::any](/ru/docs/reference/task-group/any.html) — Первый успешный результат
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Все результаты
