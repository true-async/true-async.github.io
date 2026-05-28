---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Перевірити, чи група закрита."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Повертає `true` після виклику `close()` або `cancel()`.

## Дивіться також

- [TaskGroup::close](/uk/docs/reference/task-group/close.html) --- Закрити групу
- [TaskGroup::isFinished](/uk/docs/reference/task-group/is-finished.html) --- Перевірити, чи завершено
