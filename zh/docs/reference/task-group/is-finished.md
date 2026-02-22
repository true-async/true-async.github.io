---
layout: docs
lang: zh
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /zh/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "检查所有任务是否已完成。"
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

当队列为空且没有活跃的协程时返回 `true`。

此状态可能是临时的：如果组未密封，仍然可以添加新任务。

## 参见

- [TaskGroup::isSealed](/zh/docs/reference/task-group/is-sealed.html) --- 检查组是否已密封
- [TaskGroup::awaitCompletion](/zh/docs/reference/task-group/await-completion.html) --- 等待完成
