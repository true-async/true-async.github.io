---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "Додати задачу до групи з автоматично збільшуваним ключем."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

Додає callable до групи з автоматично збільшуваним ключем (0, 1, 2, ...).

Якщо обмеження паралельності не встановлено або слот доступний, корутина створюється негайно.
В іншому випадку callable з аргументами потрапляє в чергу і запускається, коли звільниться слот.

## Параметри

**task**
: Callable для виконання. Приймає будь-який callable: Closure, функцію, метод.

**args**
: Аргументи, що передаються до callable.

## Помилки

Кидає `Async\AsyncException`, якщо група запечатана (`seal()`) або скасована (`cancel()`).

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### Приклад #2 З аргументами

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## Дивіться також

- [TaskGroup::spawnWithKey](/uk/docs/reference/task-group/spawn-with-key.html) --- Додати задачу з явним ключем
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) --- Дочекатися всіх задач
