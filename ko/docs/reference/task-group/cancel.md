---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/cancel.html
page_title: "TaskGroup::cancel"
description: "그룹의 모든 태스크를 취소합니다."
---

# TaskGroup::cancel

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::cancel(?Async\AsyncCancellation $cancellation = null): void
```

실행 중인 모든 코루틴과 대기열의 태스크를 취소합니다.
암묵적으로 `seal()`을 호출합니다. 대기열의 태스크는 시작되지 않습니다.

코루틴은 `AsyncCancellation`을 수신하고 종료됩니다.
취소는 비동기적으로 수행됩니다 --- 완료를 보장하려면 `awaitCompletion()`을 사용하세요.

## 매개변수

**cancellation**
: 취소 이유로 사용되는 예외입니다. `null`이면 "TaskGroup cancelled" 메시지가 포함된 표준 `AsyncCancellation`이 사용됩니다.

## 예제

### 예제 #1 완료 대기와 함께 취소

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        Async\delay(10000);
        return "long task";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "모든 태스크가 취소되었습니다\n";
});
```

### 예제 #2 이유가 있는 취소

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();
    $group->spawn(fn() => Async\delay(10000));

    $group->cancel(new \Async\AsyncCancellation("타임아웃 초과"));
    $group->awaitCompletion();
});
```

## 참고

- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) --- 취소 없이 봉인
- [TaskGroup::awaitCompletion](/ko/docs/reference/task-group/await-completion.html) --- 완료 대기
- [TaskGroup::dispose](/ko/docs/reference/task-group/dispose.html) --- 그룹 스코프 해제
