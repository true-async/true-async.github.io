---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/is-finished.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/is-finished.html
page_title: "TaskGroup::isFinished"
description: "모든 태스크가 완료되었는지 확인합니다."
---

# TaskGroup::isFinished

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::isFinished(): bool
```

대기열이 비어있고 활성 코루틴이 없으면 `true`를 반환합니다.

이 상태는 일시적일 수 있습니다: 그룹이 봉인되지 않은 경우 새 태스크를 계속 추가할 수 있습니다.

## 참고

- [TaskGroup::isSealed](/ko/docs/reference/task-group/is-sealed.html) --- 그룹이 봉인되었는지 확인
- [TaskGroup::awaitCompletion](/ko/docs/reference/task-group/await-completion.html) --- 완료 대기
