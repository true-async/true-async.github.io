---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "检查组是否已密封。"
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

在调用 `seal()` 或 `cancel()` 后返回 `true`。

## 参见

- [TaskGroup::seal](/zh/docs/reference/task-group/seal.html) --- 密封组
- [TaskGroup::isFinished](/zh/docs/reference/task-group/is-finished.html) --- 检查是否完成
