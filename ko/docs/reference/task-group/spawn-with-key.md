---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/spawn-with-key.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/spawn-with-key.html
page_title: "TaskGroup::spawnWithKey"
description: "명시적 키로 그룹에 태스크를 추가합니다."
---

# TaskGroup::spawnWithKey

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::spawnWithKey(string|int $key, callable $task, mixed ...$args): void
```

지정된 키로 그룹에 callable을 추가합니다.
태스크 결과는 `all()`, `getResults()` 및 반복 중에 이 키로 접근할 수 있습니다.

## 매개변수

**key**
: 태스크 키입니다. 문자열 또는 정수입니다. 중복은 허용되지 않습니다.

**task**
: 실행할 callable입니다.

**args**
: callable에 전달되는 인자입니다.

## 오류

그룹이 봉인되었거나 키가 이미 존재하는 경우 `Async\AsyncException`을 발생시킵니다.

## 예제

### 예제 #1 이름 있는 태스크

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('profile', fn() => ['name' => 'John']);
    $group->spawnWithKey('orders', fn() => [101, 102, 103]);

    $group->seal();
    $results = $group->all();

    var_dump($results['profile']); // array(1) { ["name"]=> string(4) "John" }
    var_dump($results['orders']);   // array(3) { [0]=> int(101) ... }
});
```

## 참고

- [TaskGroup::spawn](/ko/docs/reference/task-group/spawn.html) --- 자동 증가 키로 태스크 추가
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
