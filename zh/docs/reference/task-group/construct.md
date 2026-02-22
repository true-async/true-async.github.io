---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "创建一个新的 TaskGroup，支持可选的并发限制。"
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

创建一个新的任务组。

## 参数

**concurrency**
: 同时运行的协程最大数量。
  `null` --- 无限制，所有任务立即启动。
  当达到限制时，新任务会放入队列，
  并在有空闲槽位时自动启动。

**scope**
: 父作用域。TaskGroup 为其协程创建子作用域。
  `null` --- 继承当前作用域。

## 示例

### 示例 #1 无限制

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // 立即启动
$group->spawn(fn() => "task 2"); // 立即启动
$group->spawn(fn() => "task 3"); // 立即启动
```

### 示例 #2 带并发限制

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // 立即启动
$group->spawn(fn() => "task 2"); // 立即启动
$group->spawn(fn() => "task 3"); // 在队列中等待
```

## 参见

- [TaskGroup::spawn](/zh/docs/reference/task-group/spawn.html) --- 添加任务
- [Scope](/zh/docs/components/scope.html) --- 协程生命周期管理
