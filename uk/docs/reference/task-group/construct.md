---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Створити нову TaskGroup з необов'язковим обмеженням паралельності."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Створює нову групу задач.

## Параметри

**concurrency**
: Максимальна кількість одночасно запущених корутин.
  `null` --- без обмежень, усі задачі запускаються негайно.
  Коли ліміт досягнуто, нові задачі потрапляють у чергу
  і запускаються автоматично, коли звільняється слот.

**scope**
: Батьківська область видимості. TaskGroup створює дочірню область для своїх корутин.
  `null` --- успадковується поточна область видимості.

## Приклади

### Приклад #1 Без обмежень

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // запускається негайно
$group->spawn(fn() => "task 2"); // запускається негайно
$group->spawn(fn() => "task 3"); // запускається негайно
```

### Приклад #2 З обмеженням паралельності

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // запускається негайно
$group->spawn(fn() => "task 2"); // запускається негайно
$group->spawn(fn() => "task 3"); // чекає в черзі
```

## Дивіться також

- [TaskGroup::spawn](/uk/docs/reference/task-group/spawn.html) --- Додати задачу
- [Scope](/uk/docs/components/scope.html) --- Управління життєвим циклом корутин
