---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/is-closed.html
page_title: "TaskGroup::isClosed"
description: "그룹이 닫혔는지 확인합니다."
---

# TaskGroup::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isClosed(): bool
```

`close()` 또는 `cancel()`이 호출된 후 `true`를 반환합니다.

## 참고

- [TaskGroup::close](/ko/docs/reference/task-group/close.html) --- 그룹 닫기
- [TaskGroup::isFinished](/ko/docs/reference/task-group/is-finished.html) --- 완료 여부 확인
