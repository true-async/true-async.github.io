---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "释放组的作用域。"
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

调用组内部作用域的 `dispose()`，从而取消所有协程。

## 参见

- [TaskGroup::cancel](/zh/docs/reference/task-group/cancel.html) --- 取消所有任务
- [Scope](/zh/docs/components/scope.html) --- 协程生命周期管理
