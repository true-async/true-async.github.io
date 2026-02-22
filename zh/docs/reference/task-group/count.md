---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "获取组中的任务总数。"
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

返回组中的任务总数：包括排队中、运行中和已完成的任务。

TaskGroup 实现了 `Countable` 接口，因此可以使用 `count($group)`。

## 返回值

任务总数（`int`）。

## 示例

### 示例 #1 统计任务

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## 参见

- [TaskGroup::isFinished](/zh/docs/reference/task-group/is-finished.html) --- 检查所有任务是否已完成
- [TaskGroup::isSealed](/zh/docs/reference/task-group/is-sealed.html) --- 检查组是否已密封
