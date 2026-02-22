---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/dispose.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/dispose.html
page_title: "TaskGroup::dispose"
description: "그룹 스코프를 해제합니다."
---

# TaskGroup::dispose

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::dispose(): void
```

그룹의 내부 스코프에서 `dispose()`를 호출하여 모든 코루틴을 취소합니다.

## 참고

- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) --- 모든 태스크 취소
- [Scope](/ko/docs/components/scope.html) --- 코루틴 수명 관리
