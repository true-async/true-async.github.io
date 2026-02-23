---
layout: docs
lang: uk
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /uk/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Створення нового TaskSet з необов'язковим обмеженням конкурентності."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Створює новий набір завдань з автоматичним очищенням результатів після доставки.

## Параметри

**concurrency**
: Максимальна кількість одночасно працюючих корутин.
  `null` — без обмежень, усі завдання запускаються одразу.
  При досягненні ліміту нові завдання потрапляють у чергу
  й запускаються автоматично при звільненні слота.

**scope**
: Батьківський scope. TaskSet створює дочірній scope для своїх корутин.
  `null` — успадковується поточний scope.

## Приклади

### Приклад #1 Без обмежень

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "завдання 1"); // запускається одразу
$set->spawn(fn() => "завдання 2"); // запускається одразу
$set->spawn(fn() => "завдання 3"); // запускається одразу
```

### Приклад #2 З обмеженням конкурентності

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "завдання 1"); // запускається одразу
$set->spawn(fn() => "завдання 2"); // запускається одразу
$set->spawn(fn() => "завдання 3"); // чекає в черзі
```

## Дивіться також

- [TaskSet::spawn](/uk/docs/reference/task-set/spawn.html) — Додати завдання
- [TaskGroup::__construct](/uk/docs/reference/task-group/construct.html) — Конструктор TaskGroup
