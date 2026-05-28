---
layout: docs
lang: en
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /en/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Check if all tasks are finished."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Returns `true` if the queue is empty and there are no active coroutines.

This state may be temporary: if the group is not closed, new tasks can still be added.

## See Also

- [TaskGroup::isClosed](/en/docs/reference/task-group/is-closed.html) --- Check if the group is closed
- [TaskGroup::awaitCompletion](/en/docs/reference/task-group/await-completion.html) --- Wait for completion
