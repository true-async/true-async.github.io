---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/all.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/all.html
page_title: "TaskGroup::all"
description: "모든 태스크 결과의 배열로 해결되는 Future를 생성합니다."
---

# TaskGroup::all

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::all(bool $ignoreErrors = false): Async\Future
```

모든 태스크가 완료되면 결과 배열로 해결되는 `Future`를 반환합니다.
배열 키는 `spawn()` / `spawnWithKey()`를 통해 할당된 키와 일치합니다.

태스크가 이미 완료된 경우 `Future`는 즉시 해결됩니다.

반환된 `Future`는 `await(?Completable $cancellation)`를 통해 취소 토큰을 지원하므로,
타임아웃 또는 기타 취소 전략을 설정할 수 있습니다.

## 매개변수

**ignoreErrors**
: `false`(기본값)이고 오류가 있는 경우, `Future`는 `CompositeException`으로 거부됩니다.
  `true`이면 오류는 무시되고 `Future`는 성공한 결과만 포함하여 해결됩니다.
  오류는 `getErrors()`를 통해 조회할 수 있습니다.

## 반환값

`Async\Future` --- 태스크 결과 배열을 포함하는 미래 결과입니다.
`->await()`를 호출하여 값을 얻습니다.

## 오류

`$ignoreErrors = false`이고 하나 이상의 태스크가 오류로 실패한 경우, `Future`는 `Async\CompositeException`으로 거부됩니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('a', fn() => 10);
    $group->spawnWithKey('b', fn() => 20);
    $group->spawnWithKey('c', fn() => 30);

    $group->seal();
    $results = $group->all()->await();

    var_dump($results['a']); // int(10)
    var_dump($results['b']); // int(20)
    var_dump($results['c']); // int(30)
});
```

### 예제 #2 오류 처리

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    try {
        $group->all()->await();
    } catch (\Async\CompositeException $e) {
        foreach ($e->getExceptions() as $ex) {
            echo $ex->getMessage() . "\n"; // "fail"
        }
    }
});
```

### 예제 #3 오류 무시

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => "ok");
    $group->spawn(fn() => throw new \RuntimeException("fail"));

    $group->seal();

    $results = $group->all(ignoreErrors: true)->await();
    echo count($results) . "\n"; // 1

    $errors = $group->getErrors();
    echo count($errors) . "\n"; // 1
});
```

### 예제 #4 타임아웃으로 대기

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => slowApi()->fetchReport());
    $group->spawn(fn() => anotherApi()->fetchStats());
    $group->seal();

    $timeout = Async\timeout(5.0);

    try {
        $results = $group->all()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "5초 이내에 데이터를 가져오지 못했습니다\n";
    }
});
```

## 참고

- [TaskGroup::awaitCompletion](/ko/docs/reference/task-group/await-completion.html) --- 예외 없이 완료 대기
- [TaskGroup::getResults](/ko/docs/reference/task-group/get-results.html) --- 대기 없이 결과 가져오기
- [TaskGroup::getErrors](/ko/docs/reference/task-group/get-errors.html) --- 오류 가져오기
