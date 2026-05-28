---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Перевірити, чи всі задачі завершені."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Повертає `true`, якщо черга порожня і немає активних корутин.

Цей стан може бути тимчасовим: якщо група не закрита, нові задачі все ще можна додавати.

## Дивіться також

- [TaskGroup::isClosed](/uk/docs/reference/task-group/is-closed.html) --- Перевірити, чи група закрита
- [TaskGroup::awaitCompletion](/uk/docs/reference/task-group/await-completion.html) --- Дочекатися завершення
