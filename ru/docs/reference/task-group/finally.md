---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "Зарегистрировать обработчик завершения группы."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

Регистрирует callback, который вызывается когда группа запечатана и все задачи завершены.
Callback получает TaskGroup в качестве параметра.

Поскольку `cancel()` неявно вызывает `seal()`, обработчик срабатывает и при отмене.

Если группа уже завершена — callback вызывается синхронно сразу.

## Параметры

**callback**
: Closure, принимающий `TaskGroup` как единственный аргумент.

## Примеры

### Пример #1 Логирование завершения

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
// Вывод:
// Завершено: 2 задач
```

### Пример #2 Вызов на уже завершённой группе

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // Группа уже завершена — callback вызывается синхронно
    $group->finally(function(TaskGroup $g) {
        echo "вызван сразу\n";
    });

    echo "после finally\n";
});
// Вывод:
// вызван сразу
// после finally
```

## См. также

- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать группу
- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить задачи
