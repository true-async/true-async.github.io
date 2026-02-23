---
layout: docs
lang: uk
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /uk/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "Додати завдання до набору з автоінкрементним ключем."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

Додає callable до набору з автоінкрементним ключем (0, 1, 2, ...).

Якщо ліміт конкурентності не задано або є вільний слот — корутина створюється одразу.
Інакше callable з аргументами потрапляє в чергу й запускається при звільненні слота.

## Параметри

**task**
: Callable для виконання. Приймає будь-який callable: Closure, функцію, метод.

**args**
: Аргументи, що передаються в callable.

## Помилки

Викидає `Async\AsyncException`, якщо набір запечатаний (`seal()`) або скасований (`cancel()`).

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "перший");
    $set->spawn(fn() => "другий");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(12) "перший"
    var_dump($results[1]); // string(12) "другий"
});
```

### Приклад #2 З аргументами

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## Дивіться також

- [TaskSet::spawnWithKey](/uk/docs/reference/task-set/spawn-with-key.html) — Додати завдання з явним ключем
- [TaskSet::joinAll](/uk/docs/reference/task-set/join-all.html) — Дочекатися всіх завдань
