---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "Проверить, завершены ли все задачи."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

Возвращает `true`, если очередь пуста и нет активных корутин.

Это состояние может быть временным: если группа не закрыта, новые задачи могут быть добавлены.

## См. также

- [TaskGroup::isClosed](/ru/docs/reference/task-group/is-closed.html) — Проверить, закрыта ли группа
- [TaskGroup::awaitCompletion](/ru/docs/reference/task-group/await-completion.html) — Дождаться завершения
