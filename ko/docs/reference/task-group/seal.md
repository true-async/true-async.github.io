---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/seal.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/seal.html
page_title: "TaskGroup::seal"
description: "새 태스크를 방지하기 위해 그룹을 봉인합니다."
---

# TaskGroup::seal

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::seal(): void
```

그룹을 봉인합니다. `spawn()` 또는 `spawnWithKey()` 사용 시도 시 예외가 발생합니다.
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
    $group->seal();

    try {
        $group->spawn(fn() => "another task");
    } catch (\Async\AsyncException $e) {
        echo $e->getMessage() . "\n";
        // "Cannot spawn tasks on a sealed TaskGroup"
    }
});
```

## 참고

- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) --- 모든 태스크 취소 (암묵적으로 seal 호출)
- [TaskGroup::isSealed](/ko/docs/reference/task-group/is-sealed.html) --- 그룹이 봉인되었는지 확인
