---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/any.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/any.html
page_title: "TaskGroup::any"
description: "첫 번째로 성공한 태스크의 결과로 해결되는 Future를 생성합니다."
---

# TaskGroup::any

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::any(): Async\Future
```

첫 번째로 *성공적으로* 완료된 태스크의 결과로 해결되는 `Future`를 반환합니다.
오류로 실패한 태스크는 건너뜁니다.
나머지 태스크는 **계속 실행됩니다**.

모든 태스크가 오류로 실패한 경우, `Future`는 `CompositeException`으로 거부됩니다.

반환된 `Future`는 `await(?Completable $cancellation)`를 통해 취소 토큰을 지원합니다.

## 반환값

`Async\Future` --- 첫 번째로 성공한 태스크의 미래 결과입니다.
`->await()`를 호출하여 값을 얻습니다.

## 오류

- 그룹이 비어있는 경우 `Async\AsyncException`을 발생시킵니다.
- 모든 태스크가 오류로 실패한 경우, `Future`는 `Async\CompositeException`으로 거부됩니다.

## 예제

### 예제 #1 첫 번째 성공

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("fail 1"));
    $group->spawn(fn() => throw new \RuntimeException("fail 2"));
    $group->spawn(fn() => "success!");

    $result = $group->any()->await();
    echo $result . "\n"; // "success!"

    // 실패한 태스크의 오류는 명시적으로 억제해야 합니다
    $group->suppressErrors();
});
```

### 예제 #2 모두 실패

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => throw new \RuntimeException("err 1"));
    $group->spawn(fn() => throw new \RuntimeException("err 2"));

    $group->seal();

    try {
        $group->any()->await();
    } catch (\Async\CompositeException $e) {
        echo count($e->getExceptions()) . "개 오류\n"; // "2개 오류"
    }
});
```

### 예제 #3 타임아웃이 있는 복원력 있는 검색

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(fn() => searchGoogle($query));
    $group->spawn(fn() => searchBing($query));
    $group->spawn(fn() => searchDuckDuckGo($query));

    $timeout = Async\timeout(3.0);

    try {
        $result = $group->any()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "3초 이내에 응답한 제공자가 없습니다\n";
    }

    $group->suppressErrors();
});
```

## 참고

- [TaskGroup::race](/ko/docs/reference/task-group/race.html) --- 첫 번째 완료 (성공 또는 오류)
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 결과
