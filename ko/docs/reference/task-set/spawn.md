---
layout: docs
lang: ko
path_key: "/docs/reference/task-set/spawn.html"
nav_active: docs
permalink: /ko/docs/reference/task-set/spawn.html
page_title: "TaskSet::spawn"
description: "자동 증분 키로 세트에 작업을 추가합니다."
---

# TaskSet::spawn

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::spawn(callable $task, mixed ...$args): void
```

자동 증분 키(0, 1, 2, ...)를 사용하여 세트에 callable을 추가합니다.

동시성 제한이 설정되지 않았거나 사용 가능한 슬롯이 있으면 코루틴이 즉시 생성됩니다.
그렇지 않으면 callable과 인수가 대기열에 배치되고 슬롯이 확보되면 시작됩니다.

## 매개변수

**task**
: 실행할 callable. Closure, 함수, 메서드 등 모든 callable을 허용합니다.

**args**
: callable에 전달할 인수.

## 오류

세트가 봉인(`seal()`)되었거나 취소(`cancel()`)된 경우 `Async\AsyncException`을 발생시킵니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(fn() => "first");
    $set->spawn(fn() => "second");

    $set->seal();
    $results = $set->joinAll()->await();

    var_dump($results[0]); // string(5) "first"
    var_dump($results[1]); // string(6) "second"
});
```

### 예제 #2 인수 전달

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawn(function(int $a, int $b) {
        return $a + $b;
    }, 10, 20);

    $set->seal();
    $results = $set->joinAll()->await();
    var_dump($results[0]); // int(30)
});
```

## 같이 보기

- [TaskSet::spawnWithKey](/ko/docs/reference/task-set/spawn-with-key.html) — 명시적 키로 작업 추가
- [TaskSet::joinAll](/ko/docs/reference/task-set/join-all.html) — 모든 작업 대기
