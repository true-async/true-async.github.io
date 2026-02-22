---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/get-errors.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/get-errors.html
page_title: "TaskGroup::getErrors"
description: "실패한 태스크의 오류 배열을 가져옵니다."
---

# TaskGroup::getErrors

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getErrors(): array
```

오류로 실패한 태스크의 예외(`Throwable`) 배열을 반환합니다.
배열 키는 `spawn()` 또는 `spawnWithKey()`의 태스크 키와 일치합니다.

이 메서드는 태스크 완료를 대기하지 않습니다 --- 호출 시점에 사용 가능한 오류만 반환합니다.

## 반환값

`array<int|string, Throwable>` --- 키는 태스크 식별자이고 값은 예외입니다.

## 예제

### 예제 #1 오류 확인

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('api', function() {
        throw new \RuntimeException("Connection timeout");
    });
    $group->spawn(fn() => "ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    foreach ($group->getErrors() as $key => $error) {
        echo "$key: {$error->getMessage()}\n";
    }
    // api: Connection timeout

    $group->suppressErrors();
});
```

## 처리되지 않은 오류

TaskGroup이 소멸될 때 처리되지 않은 오류가 남아있으면 소멸자가 이를 알립니다.
오류는 다음과 같은 경우에 처리된 것으로 간주됩니다:

- `all()`이 `ignoreErrors: false`(기본값)로 호출되어 `CompositeException`을 발생시킨 경우
- `suppressErrors()`가 호출된 경우
- 이터레이터(`foreach`)를 통해 오류가 처리된 경우

## 참고

- [TaskGroup::getResults](/ko/docs/reference/task-group/get-results.html) --- 결과 배열 가져오기
- [TaskGroup::suppressErrors](/ko/docs/reference/task-group/suppress-errors.html) --- 오류를 처리됨으로 표시
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
