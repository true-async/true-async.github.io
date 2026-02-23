---
layout: docs
lang: ru
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /ru/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "Создание нового TaskSet с опциональным ограничением конкурентности."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Создаёт новый набор задач с автоматической очисткой результатов после доставки.

## Параметры

**concurrency**
: Максимальное количество одновременно работающих корутин.
  `null` — без ограничений, все задачи запускаются сразу.
  При достижении лимита новые задачи помещаются в очередь
  и запускаются автоматически при освобождении слота.

**scope**
: Родительский scope. TaskSet создаёт дочерний scope для своих корутин.
  `null` — наследуется текущий scope.

## Примеры

### Пример #1 Без ограничений

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "задача 1"); // запускается сразу
$set->spawn(fn() => "задача 2"); // запускается сразу
$set->spawn(fn() => "задача 3"); // запускается сразу
```

### Пример #2 С ограничением конкурентности

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "задача 1"); // запускается сразу
$set->spawn(fn() => "задача 2"); // запускается сразу
$set->spawn(fn() => "задача 3"); // ждёт в очереди
```

## См. также

- [TaskSet::spawn](/ru/docs/reference/task-set/spawn.html) — Добавить задачу
- [TaskGroup::__construct](/ru/docs/reference/task-group/construct.html) — Конструктор TaskGroup
