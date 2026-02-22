---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/race.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/race.html
page_title: "TaskGroup::race"
description: "첫 번째로 완료된 태스크의 결과로 해결되는 Future를 생성합니다."
---

# TaskGroup::race

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::race(): Async\Future
```

첫 번째로 완료된 태스크의 결과로 해결되는 `Future`를 반환합니다 --- 성공이든 실패든 관계없이.
태스크가 오류로 실패한 경우, `Future`는 해당 예외로 거부됩니다.
나머지 태스크는 **계속 실행됩니다**.

이미 완료된 태스크가 있으면 `Future`는 즉시 해결됩니다.

반환된 `Future`는 `await(?Completable $cancellation)`를 통해 취소 토큰을 지원합니다.

## 반환값

`Async\Future` --- 첫 번째로 완료된 태스크의 미래 결과입니다.
`->await()`를 호출하여 값을 얻습니다.

## 오류

- 그룹이 비어있는 경우 `Async\AsyncException`을 발생시킵니다.
- 첫 번째로 완료된 태스크가 오류로 실패한 경우, `Future`는 해당 태스크의 예외로 거부됩니다.

## 예제

### 예제 #1 첫 번째 응답

```php
<?php

use Async\TaskGroup;
use function Async\delay;

spawn(function() {
    $group = new TaskGroup();

    $group->spawn(function() { delay(100); return "slow"; });
    $group->spawn(fn() => "fast");

    $winner = $group->race()->await();
    echo $winner . "\n"; // "fast"
});
```

### 예제 #2 타임아웃이 있는 헤지 요청

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];
    $group = new TaskGroup();

    foreach ($replicas as $host) {
        $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
    }

    $timeout = Async\timeout(2.0);

    try {
        $product = $group->race()->await($timeout);
    } catch (Async\TimeoutException) {
        echo "2초 이내에 응답한 레플리카가 없습니다\n";
    }
});
```

## 참고

- [TaskGroup::any](/ko/docs/reference/task-group/any.html) --- 첫 번째 성공한 결과
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 결과
