---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Зареєструвати обробник завершення для групи."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Реєструє зворотний виклик, який виконується, коли група запечатана і всі задачі завершені.
Зворотний виклик отримує TaskGroup як параметр.

Оскільки `cancel()` неявно викликає `seal()`, обробник також спрацьовує при скасуванні.

Якщо група вже завершена, зворотний виклик виконується синхронно негайно.

## Параметри

**callback**
: Closure, що приймає `TaskGroup` як єдиний аргумент.

## Приклади

### Приклад #1 Логування завершення

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "Завершено: " . $g->count() . " задач\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// Виведе:
// Завершено: 2 задач
```

### Приклад #2 Виклик на вже завершеній групі

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Група вже завершена — зворотний виклик виконується синхронно
    $group->finally(function(TaskGroup $g) {
        echo "викликано негайно\n";
    });

    echo "після finally\n";
});
// Виведе:
// викликано негайно
// після finally
```

## Дивіться також

- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) --- Запечатати групу
- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) --- Скасувати задачі
