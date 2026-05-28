---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/close.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/close.html
page_title: "TaskGroup::close"
description: "새 태스크 추가를 막기 위해 그룹을 닫습니다."
---

# TaskGroup::close

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::close(): void
```

그룹을 닫습니다. 닫힌 그룹에서 `spawn()` 또는 `spawnWithKey()`를 시도하면 예외가 발생합니다.
이미 실행 중인 코루틴과 대기열의 태스크는 계속 실행됩니다.

반복 호출은 무시됩니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "task");
    $group->close();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## 참고

- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) --- 모든 태스크 취소 (암묵적으로 close 호출)
- [TaskGroup::isClosed](/ko/docs/reference/task-group/is-closed.html) --- 그룹이 닫혔는지 확인
