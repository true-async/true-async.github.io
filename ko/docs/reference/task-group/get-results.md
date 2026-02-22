---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/get-results.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/get-results.html
page_title: "TaskGroup::getResults"
description: "완료된 태스크의 결과 배열을 가져옵니다."
---

# TaskGroup::getResults

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getResults(): array
```

성공적으로 완료된 태스크의 결과 배열을 반환합니다.
배열 키는 `spawn()`(자동 증가) 또는 `spawnWithKey()`(사용자 지정)로 할당된 키와 일치합니다.

이 메서드는 태스크 완료를 대기하지 않습니다 --- 호출 시점에 사용 가능한 결과만 반환합니다.

## 반환값

`array<int|string, mixed>` --- 키는 태스크 식별자이고 값은 실행 결과입니다.

## 예제

### 예제 #1 all() 이후 결과 가져오기

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('user', fn() => ['name' => 'Alice']);
    $group->spawnWithKey('orders', fn() => [101, 102]);

    $group->seal();
    $group->all();

    $results = $group->getResults();
    // ['user' => ['name' => 'Alice'], 'orders' => [101, 102]]
});
```

### 예제 #2 결과에 오류는 포함되지 않음

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(function() { throw new \RuntimeException("fail"); });
    $group->spawn(fn() => "also ok");

    $group->seal();
    $group->all(ignoreErrors: true);

    $results = $group->getResults();
    // [0 => "ok", 2 => "also ok"]

    $errors = $group->getErrors();
    // [1 => RuntimeException("fail")]

    $group->suppressErrors();
});
```

## 참고

- [TaskGroup::getErrors](/ko/docs/reference/task-group/get-errors.html) --- 오류 배열 가져오기
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
- [TaskGroup::suppressErrors](/ko/docs/reference/task-group/suppress-errors.html) --- 오류를 처리됨으로 표시
