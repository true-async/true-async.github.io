---
layout: docs
lang: zh
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "检查任务集合是否已关闭。"
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

如果任务集合已关闭（调用过 `close()` 或 `cancel()`），返回 `true`。

## 返回值

`true` 表示已关闭；否则 `false`。

## 示例

### 示例 #1 检查状态

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "yes\n" : "no\n"; // "no"

    $set->close();
    echo $set->isClosed() ? "yes\n" : "no\n"; // "yes"
});
```

## 参见

- [TaskSet::close](/zh/docs/reference/task-set/close.html) --- 关闭任务集合
- [TaskSet::isFinished](/zh/docs/reference/task-set/is-finished.html) --- 检查任务是否完成
