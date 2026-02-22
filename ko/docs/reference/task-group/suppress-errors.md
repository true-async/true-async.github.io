---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/suppress-errors.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/suppress-errors.html
page_title: "TaskGroup::suppressErrors"
description: "모든 현재 오류를 처리됨으로 표시합니다."
---

# TaskGroup::suppressErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::suppressErrors(): void
```

그룹의 모든 현재 오류를 처리됨으로 표시합니다.

TaskGroup이 소멸될 때 처리되지 않은 오류를 확인합니다. 오류가 처리되지 않은 경우
(`all()`, `foreach`, 또는 `suppressErrors()`를 통해), 소멸자가 손실된 오류를 알립니다.
`suppressErrors()` 호출은 오류가 처리되었음을 명시적으로 확인하는 것입니다.

## 예제

### 예제 #1 선택적 처리 후 오류 억제

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail 1"); });
    $group->spawn(function() { throw new \LogicException("fail 2"); });

    $group->seal();
    $group->all(ignoreErrors: true);

    // 수동으로 오류 처리
    foreach ($group->getErrors() as $key => $error) {
        log_error("태스크 $key: {$error->getMessage()}");
    }

    // 오류를 처리됨으로 표시
    $group->suppressErrors();
});
```

## 참고

- [TaskGroup::getErrors](/ko/docs/reference/task-group/get-errors.html) --- 오류 배열 가져오기
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
