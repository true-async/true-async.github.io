---
layout: docs
lang: uk
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /uk/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "Вивільнити область видимості групи."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

Викликає `dispose()` на внутрішній області видимості групи, що призводить до скасування всіх корутин.

## Дивіться також

- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) --- Скасувати всі задачі
- [Scope](/uk/docs/components/scope.html) --- Управління життєвим циклом корутин
