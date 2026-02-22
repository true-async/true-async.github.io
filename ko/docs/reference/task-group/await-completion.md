---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/await-completion.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/await-completion.html
page_title: "TaskGroup::awaitCompletion"
description: "예외를 발생시키지 않고 모든 태스크가 완료될 때까지 대기합니다."
---

# TaskGroup::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::awaitCompletion(): void
```

그룹의 모든 태스크가 완전히 완료될 때까지 대기합니다.
`all()`과 달리 결과를 반환하지 않으며 태스크 오류에 대한 예외를 발생시키지 않습니다.

이 메서드를 호출하기 전에 그룹이 봉인되어야 합니다.

일반적인 사용 사례는 `cancel()` 후 코루틴이 실제로 완료될 때까지 대기하는 것입니다.
`cancel()` 메서드는 취소를 시작하지만 코루틴이 비동기적으로 완료될 수 있습니다.
`awaitCompletion()`은 모든 코루틴이 중지되었음을 보장합니다.

## 오류

그룹이 봉인되지 않은 경우 `Async\AsyncException`을 발생시킵니다.

## 예제

### 예제 #1 취소 후 대기

```php
<?php

use Async\TaskGroup;
use function Async\suspend;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() {
        suspend();
        return "result";
    });

    $group->cancel();
    $group->awaitCompletion();

    echo "모든 코루틴이 완료되었습니다\n";
    var_dump($group->isFinished()); // bool(true)
});
```

### 예제 #2 대기 후 결과 가져오기

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();
    $group->awaitCompletion();

    // 예외 없음 — 수동으로 확인
    $results = $group->getResults();
    $errors = $group->getErrors();

    echo "성공: " . count($results) . "\n"; // 1
    echo "오류: " . count($errors) . "\n";      // 1
});
```

## 참고

- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크를 대기하고 결과 가져오기
- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) --- 모든 태스크 취소
- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) --- 그룹 봉인
