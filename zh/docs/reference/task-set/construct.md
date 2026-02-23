---
layout: docs
lang: zh
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /zh/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "创建一个新的 TaskSet，可选并发限制。"
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

创建一个新的任务集合，结果交付后自动清理。

## 参数

**concurrency**
: 最大并发运行协程数。
  `null` — 无限制，所有任务立即启动。
  达到限制后，新任务会被放入队列，
  在有空闲槽位时自动启动。

**scope**
: 父作用域。TaskSet 会为其协程创建子作用域。
  `null` — 继承当前作用域。

## 示例

### 示例 #1 无限制

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // 立即启动
$set->spawn(fn() => "task 2"); // 立即启动
$set->spawn(fn() => "task 3"); // 立即启动
```

### 示例 #2 带并发限制

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // 立即启动
$set->spawn(fn() => "task 2"); // 立即启动
$set->spawn(fn() => "task 3"); // 在队列中等待
```

## 参见

- [TaskSet::spawn](/zh/docs/reference/task-set/spawn.html) — 添加任务
- [TaskGroup::__construct](/zh/docs/reference/task-group/construct.html) — TaskGroup 构造函数
