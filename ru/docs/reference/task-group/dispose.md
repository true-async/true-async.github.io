---
layout: docs
lang: ru
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /ru/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Уничтожить scope группы."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Вызывает `dispose()` на внутреннем scope группы, что приводит к отмене всех корутин.

## См. также

- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить все задачи
- [Scope](/ru/docs/components/scope.html) — Управление жизнью корутин
