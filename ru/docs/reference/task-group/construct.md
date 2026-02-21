---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "Создание нового TaskGroup с опциональным ограничением конкурентности."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

Создаёт новую группу задач.

## Параметры

**concurrency**
: Максимальное количество одновременно работающих корутин.
  `null` — без ограничений, все задачи запускаются сразу.
  При достижении лимита новые задачи помещаются в очередь
  и запускаются автоматически при освобождении слота.

**scope**
: Родительский scope. TaskGroup создаёт дочерний scope для своих корутин.
  `null` — наследуется текущий scope.

## Примеры

### Пример #1 Без ограничений

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "задача 1"); // запускается сразу
$group->spawn(fn() => "задача 2"); // запускается сразу
$group->spawn(fn() => "задача 3"); // запускается сразу
```

### Пример #2 С ограничением конкурентности

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "задача 1"); // запускается сразу
$group->spawn(fn() => "задача 2"); // запускается сразу
$group->spawn(fn() => "задача 3"); // ждёт в очереди
```

## См. также

- [TaskGroup::spawn](/ru/docs/reference/task-group/spawn.html) — Добавить задачу
- [Scope](/ru/docs/components/scope.html) — Управление жизнью корутин
