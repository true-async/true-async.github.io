---
layout: docs
lang: en
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /en/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Check if the group is closed."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Returns `true` after `close()` or `cancel()` has been called.

## See Also

- [TaskGroup::close](/en/docs/reference/task-group/close.html) --- Close the group
- [TaskGroup::isFinished](/en/docs/reference/task-group/is-finished.html) --- Check if finished
