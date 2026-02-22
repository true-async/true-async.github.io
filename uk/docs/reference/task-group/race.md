---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "Створити Future, який повертає результат першої завершеної задачі."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

Повертає `Future`, який завершується з результатом першої завершеної задачі --- незалежно від того, успішно чи з помилкою.
Якщо задача завершилась з помилкою, `Future` відхиляється з цим винятком.
Решта задач **продовжують виконання**.

Якщо вже є завершена задача, `Future` завершується негайно.

Повернений `Future` підтримує токен скасування через `await(?Completable $cancellation)`.

## Значення, що повертається

`Async\Future` --- майбутній результат першої завершеної задачі.
Викличте `->await()`, щоб отримати значення.

## Помилки

- Кидає `Async\AsyncException`, якщо група порожня.
- `Future` відхиляється з винятком задачі, якщо перша завершена задача завершилась з помилкою.

## Приклади

### Приклад #1 Перша відповідь

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

### Приклад #2 Хеджовані запити з тайм-аутом

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
        echo "Жодна репліка не відповіла за 2 секунди\n";
    }
});
```

## Дивіться також

- [TaskGroup::any](/uk/docs/reference/task-group/any.html) --- Перший успішний результат
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Усі результати
