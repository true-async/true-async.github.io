---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/count.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/count.html
page_title: "TaskGroup::count"
description: "그룹의 총 태스크 수를 가져옵니다."
---

# TaskGroup::count

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::count(): int
```

그룹의 총 태스크 수를 반환합니다: 대기 중, 실행 중, 완료된 태스크 모두 포함됩니다.

TaskGroup은 `Countable` 인터페이스를 구현하므로 `count($group)`을 사용할 수 있습니다.

## 반환값

총 태스크 수 (`int`).

## 예제

### 예제 #1 태스크 수 세기

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 2);

    $group->spawn(fn() => "a");
    $group->spawn(fn() => "b");
    $group->spawn(fn() => "c");

    echo count($group); // 3

    $group->seal();
    $group->all();

    echo count($group); // 3
});
```

## 참고

- [TaskGroup::isFinished](/ko/docs/reference/task-group/is-finished.html) --- 모든 태스크가 완료되었는지 확인
- [TaskGroup::isSealed](/ko/docs/reference/task-group/is-sealed.html) --- 그룹이 봉인되었는지 확인
