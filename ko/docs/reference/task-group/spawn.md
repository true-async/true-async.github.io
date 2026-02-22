---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/spawn.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/spawn.html
page_title: "TaskGroup::spawn"
description: "자동 증가 키로 그룹에 태스크를 추가합니다."
---

# TaskGroup::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawn(callable $task, mixed ...$args): void
```

자동 증가 키(0, 1, 2, ...)로 그룹에 callable을 추가합니다.

동시성 제한이 설정되지 않았거나 슬롯이 사용 가능한 경우, 코루틴이 즉시 생성됩니다.
그렇지 않으면 callable과 인자가 대기열에 배치되고 슬롯이 사용 가능해지면 시작됩니다.

## 매개변수

**task**
: 실행할 callable입니다. Closure, 함수, 메서드 등 모든 callable을 받습니다.

**args**
: callable에 전달되는 인자입니다.

## 오류

그룹이 봉인(`seal()`)되었거나 취소(`cancel()`)된 경우 `Async\AsyncException`을 발생시킵니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "first");
    $group->spawn(fn() => "second");

    $group->seal();
    $results = $group->all();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### 예제 #2 인자 사용

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function(int $id) {
        return "user:$id";
    }, 42);

    $group->seal();
    $results = $group->all();
    var_dump($results[0]); // string(7) "user:42"
});
```

## 참고

- [TaskGroup::spawnWithKey](/ko/docs/reference/task-group/spawn-with-key.html) --- 명시적 키로 태스크 추가
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
