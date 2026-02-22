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

Цей стан може бути тимчасовим: якщо група не запечатана, нові задачі все ще можна додавати.

## Дивіться також

- [TaskGroup::isSealed](/uk/docs/reference/task-group/is-sealed.html) --- Перевірити, чи група запечатана
- [TaskGroup::awaitCompletion](/uk/docs/reference/task-group/await-completion.html) --- Дочекатися завершення
