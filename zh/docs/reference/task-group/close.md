---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "关闭任务组，阻止再添加新任务。"
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

关闭任务组。此后调用 `spawn()` 或 `spawnWithKey()` 都会抛出异常。
已经在跑的协程和排队中的任务继续执行。

重复调用是 no-op。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->close();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## 参见

- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) --- 取消所有任务（隐式 close）
- [TaskGroup::isClosed](/zh/docs/reference/task-group/is-closed.html) --- 检查任务组是否已关闭
