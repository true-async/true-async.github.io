---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Проверить, запечатана ли группа."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Возвращает `true` после вызова `seal()` или `cancel()`.

## См. также

- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать группу
- [TaskGroup::isFinished](/ru/docs/reference/task-group/is-finished.html) — Проверить завершение
