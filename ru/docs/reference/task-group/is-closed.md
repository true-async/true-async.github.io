---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "Проверить, закрыта ли группа."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

Возвращает `true` после вызова `close()` или `cancel()`.

## См. также

- [TaskGroup::close](/ru/docs/reference/task-group/close.html) — Закрыть группу
- [TaskGroup::isFinished](/ru/docs/reference/task-group/is-finished.html) — Проверить завершение
