---
layout: docs
lang: zh
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /zh/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "关闭任务集合，阻止再添加新任务。"
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
```

关闭任务集合。此后 `spawn()` 与 `spawnWithKey()` 都会抛出异常。
已经在跑的协程和排队中的任务继续执行。

重复调用是 no-op。

## 示例

### 示例 #1 基本用法

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "task");
    $set->close();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## 参见

- [TaskSet::cancel](/zh/docs/reference/task-set/cancel.html) --- 取消所有任务（隐式 close）
- [TaskSet::isClosed](/zh/docs/reference/task-set/is-closed.html) --- 检查任务集合是否已关闭
