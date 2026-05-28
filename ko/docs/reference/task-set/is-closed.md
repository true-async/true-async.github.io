---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/is-closed.html
page_title: "TaskSet::isClosed"
description: "셋이 닫혔는지 확인합니다."
---

# TaskSet::isClosed

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::isClosed(): bool
```

셋이 닫혔으면 (`close()` 또는 `cancel()`이 호출됨) `true`를 반환합니다.

## 반환 값

셋이 닫혔으면 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 상태 확인

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    echo $set->isClosed() ? "yes\n" : "no\n"; // "no"

    $set->close();
    echo $set->isClosed() ? "yes\n" : "no\n"; // "yes"
});
```

## 참고

- [TaskSet::close](/ko/docs/reference/task-set/close.html) --- 셋 닫기
- [TaskSet::isFinished](/ko/docs/reference/task-set/is-finished.html) --- 태스크 완료 여부 확인
