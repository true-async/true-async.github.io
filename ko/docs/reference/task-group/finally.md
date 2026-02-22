---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/finally.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/finally.html
page_title: "TaskGroup::finally"
description: "그룹의 완료 핸들러를 등록합니다."
---

# TaskGroup::finally

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::finally(Closure $callback): void
```

그룹이 봉인되고 모든 태스크가 완료되었을 때 호출되는 콜백을 등록합니다.
콜백은 TaskGroup을 매개변수로 받습니다.

`cancel()`이 암묵적으로 `seal()`을 호출하므로, 취소 시에도 핸들러가 실행됩니다.

그룹이 이미 완료된 경우 콜백은 즉시 동기적으로 호출됩니다.

## 매개변수

**callback**
: `TaskGroup`을 유일한 인자로 받는 Closure입니다.

## 예제

### 예제 #1 완료 로깅

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->finally(function(TaskGroup $g) {
        echo "완료: " . $g->count() . "개 태스크\n";
    });

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");

    $group->seal();
    $group->all();
});
// 출력:
// 완료: 2개 태스크
```

### 예제 #2 이미 완료된 그룹에서 호출

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => 1);
    $group->seal();
    $group->all();

    // 그룹이 이미 완료됨 — 콜백이 동기적으로 호출됩니다
    $group->finally(function(TaskGroup $g) {
        echo "즉시 호출됨\n";
    });

    echo "finally 이후\n";
});
// 출력:
// 즉시 호출됨
// finally 이후
```

## 참고

- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) --- 그룹 봉인
- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) --- 태스크 취소
