---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/construct.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/construct.html
page_title: "TaskGroup::__construct"
description: "선택적 동시성 제한이 있는 새 TaskGroup을 생성합니다."
---

# TaskGroup::__construct

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::__construct(?int $concurrency = null, ?Async\Scope $scope = null)
```

새로운 태스크 그룹을 생성합니다.

## 매개변수

**concurrency**
: 동시에 실행되는 코루틴의 최대 수입니다.
  `null` --- 제한 없음, 모든 태스크가 즉시 시작됩니다.
  제한에 도달하면 새 태스크는 대기열에 배치되고
  슬롯이 사용 가능해지면 자동으로 시작됩니다.

**scope**
: 부모 스코프입니다. TaskGroup은 코루틴을 위한 자식 스코프를 생성합니다.
  `null` --- 현재 스코프를 상속합니다.

## 예제

### 예제 #1 제한 없이

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup();
$group->spawn(fn() => "task 1"); // 즉시 시작
$group->spawn(fn() => "task 2"); // 즉시 시작
$group->spawn(fn() => "task 3"); // 즉시 시작
```

### 예제 #2 동시성 제한 사용

```php
<?php

use Async\TaskGroup;

$group = new TaskGroup(concurrency: 2);
$group->spawn(fn() => "task 1"); // 즉시 시작
$group->spawn(fn() => "task 2"); // 즉시 시작
$group->spawn(fn() => "task 3"); // 대기열에서 대기
```

## 참고

- [TaskGroup::spawn](/ko/docs/reference/task-group/spawn.html) --- 태스크 추가
- [Scope](/ko/docs/components/scope.html) --- 코루틴 수명 관리
