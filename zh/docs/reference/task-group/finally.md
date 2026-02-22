---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "为组注册完成回调。"
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

注册一个回调，当组被密封且所有任务完成时调用。
回调接收 TaskGroup 作为参数。

由于 `cancel()` 隐式调用 `seal()`，所以回调在取消时也会触发。

如果组已经完成，回调会立即同步调用。

## 参数

**callback**
: 一个以 `TaskGroup` 作为唯一参数的 Closure。

## 示例

### 示例 #1 记录完成日志

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "已完成: " . $g->count() . " 个任务\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// 输出:
// 已完成: 2 个任务
```

### 示例 #2 在已完成的组上调用

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // 组已经完成 --- 回调会同步立即调用
    $group->finally(function(TaskGroup $g) {
        echo "立即调用\n";
    });

    echo "finally 之后\n";
});
// 输出:
// 立即调用
// finally 之后
```

## 参见

- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) --- 密封组
- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) --- 取消任务
