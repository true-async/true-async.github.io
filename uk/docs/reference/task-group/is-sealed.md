---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "Перевірити, чи група запечатана."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

Повертає `true` після виклику `seal()` або `cancel()`.

## Дивіться також

- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) --- Запечатати групу
- [TaskGroup::isFinished](/uk/docs/reference/task-group/is-finished.html) --- Перевірити, чи завершено
