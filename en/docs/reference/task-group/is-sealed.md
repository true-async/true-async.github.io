---
layout: docs
lang: en
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /en/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Check if the group is sealed."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Returns `true` after `seal()` or `cancel()` has been called.

## See Also

- [TaskGroup::seal](/en/docs/reference/task-group/seal.html) --- Seal the group
- [TaskGroup::isFinished](/en/docs/reference/task-group/is-finished.html) --- Check if finished
