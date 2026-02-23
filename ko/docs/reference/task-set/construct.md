---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/construct.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/construct.html
page_title: "TaskSet::__construct"
description: "선택적 동시성 제한으로 새 TaskSet을 생성합니다."
---

# TaskSet::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

결과 전달 후 자동 정리되는 새 작업 세트를 생성합니다.

## 매개변수

**concurrency**
: 동시에 실행되는 코루틴의 최대 수.
  `null` — 제한 없이 모든 작업이 즉시 시작됩니다.
  제한에 도달하면 새 작업이 대기열에 배치되고
  슬롯이 확보되면 자동으로 시작됩니다.

**scope**
: 부모 scope. TaskSet은 자체 코루틴을 위한 자식 scope를 생성합니다.
  `null` — 현재 scope를 상속합니다.

## 예제

### 예제 #1 제한 없이

```php
<?php

use Async\TaskSet;

$set = new TaskSet();
$set->spawn(fn() => "task 1"); // 즉시 시작
$set->spawn(fn() => "task 2"); // 즉시 시작
$set->spawn(fn() => "task 3"); // 즉시 시작
```

### 예제 #2 동시성 제한 포함

```php
<?php

use Async\TaskSet;

$set = new TaskSet(concurrency: 2);
$set->spawn(fn() => "task 1"); // 즉시 시작
$set->spawn(fn() => "task 2"); // 즉시 시작
$set->spawn(fn() => "task 3"); // 대기열에서 대기
```

## 같이 보기

- [TaskSet::spawn](/ko/docs/reference/task-set/spawn.html) — 작업 추가
- [TaskGroup::__construct](/ko/docs/reference/task-group/construct.html) — TaskGroup 생성자
