---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/is-sealed.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/is-sealed.html
page_title: "TaskGroup::isSealed"
description: "그룹이 봉인되었는지 확인합니다."
---

# TaskGroup::isSealed

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isSealed(): bool
```

`seal()` 또는 `cancel()`이 호출된 후 `true`를 반환합니다.

## 참고

- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) --- 그룹 봉인
- [TaskGroup::isFinished](/ko/docs/reference/task-group/is-finished.html) --- 완료 여부 확인
