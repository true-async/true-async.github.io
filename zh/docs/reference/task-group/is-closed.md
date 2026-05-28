---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "检查任务组是否已关闭。"
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

在调用 `close()` 或 `cancel()` 之后返回 `true`。

## 参见

- [TaskGroup::close](/zh/docs/reference/task-group/close.html) --- 关闭任务组
- [TaskGroup::isFinished](/zh/docs/reference/task-group/is-finished.html) --- 检查是否完成
