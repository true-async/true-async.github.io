---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "密封组以阻止添加新任务。"
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

密封组。之后使用 `spawn()` 或 `spawnWithKey()` 将抛出异常。
已运行的协程和排队的任务继续执行。

重复调用不会有任何效果。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->seal();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## 参见

- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) --- 取消所有任务（隐式调用 seal）
- [TaskGroup::isSealed](/zh/docs/reference/task-group/is-sealed.html) --- 检查组是否已密封
