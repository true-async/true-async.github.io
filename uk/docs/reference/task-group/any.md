---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "Створити Future, який повертає результат першої успішної задачі."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

Повертає `Future`, який завершується з результатом першої *успішно* виконаної задачі.
Задачі, що завершились з помилкою, пропускаються.
Решта задач **продовжують виконання**.

Якщо всі задачі завершились з помилками, `Future` відхиляється з `CompositeException`.

Повернений `Future` підтримує токен скасування через `await(?Completable $cancellation)`.

## Значення, що повертається

`Async\Future` --- майбутній результат першої успішної задачі.
Викличте `->await()`, щоб отримати значення.

## Помилки

- Кидає `Async\AsyncException`, якщо група порожня.
- `Future` відхиляється з `Async\CompositeException`, якщо всі задачі завершились з помилками.

## Приклади

### Приклад #1 Перша успішна

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // Помилки невдалих задач потрібно явно придушити
    $group->suppressErrors();
});
```

### Приклад #2 Усі невдалі

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . " errors\n"; // "2 errors"
    }
});
```

### Приклад #3 Стійкий пошук з тайм-аутом

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "Жоден провайдер не відповів за 3 секунди\n";
    }

    $group->suppressErrors();
});
```

## Дивіться також

- [TaskGroup::race](/uk/docs/reference/task-group/race.html) --- Перша завершена (успіх або помилка)
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Усі результати
