---
layout: docs
lang: en
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /en/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Dispose of the group scope."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Calls `dispose()` on the group's internal scope, which results in cancelling all coroutines.

## See Also

- [TaskGroup::cancel](/en/docs/reference/task-group/cancel.html) --- Cancel all tasks
- [Scope](/en/docs/components/scope.html) --- Coroutine lifecycle management
