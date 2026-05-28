---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/close.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/close.html
page_title: "TaskSet::close"
description: "새 태스크 추가를 막기 위해 셋을 닫습니다."
---

# TaskSet::close

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::close(): void
```

셋을 닫습니다. 이후 `spawn()`과 `spawnWithKey()`는 예외를 던집니다.
이미 실행 중인 코루틴과 대기열의 태스크는 계속 동작합니다.

반복 호출은 무시됩니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "task");
    $set->close();

    try {
        $set->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a closed TaskGroup"
    }
});
```

## 참고

- [TaskSet::cancel](/ko/docs/reference/task-set/cancel.html) --- 모든 태스크 취소 (암묵적으로 close 호출)
- [TaskSet::isClosed](/ko/docs/reference/task-set/is-closed.html) --- 셋이 닫혔는지 확인
