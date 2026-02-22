---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "取消组中的所有任务。"
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

取消所有正在运行的协程和排队的任务。
隐式调用 `seal()`。排队的任务不会被启动。

协程接收到 `AsyncCancellation` 后终止。
取消是异步发生的 --- 使用 `awaitCompletion()` 来保证完成。

## 参数

**cancellation**
: 作为取消原因的异常。如果为 `null`，则使用消息为 "TaskGroup cancelled" 的标准 `AsyncCancellation`。

## 示例

### 示例 #1 取消并等待完成

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "所有任务已取消\n";
});
```

### 示例 #2 带原因的取消

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("超时已到"));
    $group->awaitCompletion();
});
```

## 参见

- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) --- 密封但不取消
- [TaskGroup::awaitCompletion](/zh/docs/reference/task-group/await-completion.html) --- 等待完成
- [TaskGroup::dispose](/zh/docs/reference/task-group/dispose.html) --- 释放组作用域
