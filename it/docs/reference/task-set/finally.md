---
layout: docs
lang: it
path_key: "/docs/reference/task-set/finally.html"
nav_active: docs
permalink: /it/docs/reference/task-set/finally.html
page_title: "TaskSet::finally"
description: "Зарегистрировать обработчик завершения набора."
---

# TaskSet::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::finally(Closure $callback): void
```

Регистрирует callback, который вызывается когда набор запечатан и все задачи завершены.
Callback получает TaskSet в качестве параметра.

Поскольку `cancel()` неявно вызывает `seal()`, обработчик срабатывает и при отмене.

Если набор уже завершён — callback вызывается синхронно сразу.

## Параметры

**callback**
: Closure, принимающий `TaskSet` как единственный аргумент.

## Примеры

### Пример #1 Логирование завершения

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->finally(function(TaskSet $s) {
        echo "Набор завершён\n";
    });

    $set->spawn(fn() => "a");
    $set->spawn(fn() => "b");

    $set->seal();
    $set->joinAll()->await();
});
// Вывод:
// Набор завершён
```

### Пример #2 Вызов на уже завершённом наборе

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();
    $set->spawn(fn() => 1);
    $set->seal();
    $set->joinAll()->await();

    // Набор уже завершён — callback вызывается синхронно
    $set->finally(function(TaskSet $s) {
        echo "вызван сразу\n";
    });

    echo "после finally\n";
});
// Вывод:
// вызван сразу
// после finally
```

## См. также

- [TaskSet::seal](/it/docs/reference/task-set/seal.html) — Запечатать набор
- [TaskSet::awaitCompletion](/it/docs/reference/task-set/await-completion.html) — Дождаться завершения
