---
layout: docs
lang: ko
path_key: "/docs/reference/task-group/get-iterator.html"
nav_active: docs
permalink: /ko/docs/reference/task-group/get-iterator.html
page_title: "TaskGroup::getIterator"
description: "태스크가 완료되는 대로 결과를 순회하는 이터레이터를 가져옵니다."
---

# TaskGroup::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskGroup::getIterator(): Iterator
```

태스크가 **완료되는 대로** 결과를 생성하는 이터레이터를 반환합니다.
TaskGroup은 `IteratorAggregate`를 구현하므로 `foreach`를 직접 사용할 수 있습니다.

## 이터레이터 동작

- `foreach`는 다음 결과가 사용 가능해질 때까지 현재 코루틴을 중단합니다
- 키는 `spawn()` 또는 `spawnWithKey()`로 할당된 것과 동일합니다
- 값은 `[mixed $result, ?Throwable $error]` 배열입니다:
  - 성공: `[$result, null]`
  - 오류: `[null, $error]`
- 그룹이 봉인되었**고** 모든 태스크가 처리되면 반복이 끝납니다
- 그룹이 봉인되지 않은 경우, `foreach`는 새 태스크를 기다리며 중단됩니다

> **중요:** `seal()`을 호출하지 않으면 반복이 무한정 대기합니다.

## 예제

### 예제 #1 결과가 준비되는 대로 처리

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup(concurrency: 3);

    for ($i = 0; $i < 10; $i++) {
        $group->spawn(fn() => fetchUrl($urls[$i]));
    }
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error !== null) {
            echo "태스크 $key 실패: {$error->getMessage()}\n";
            continue;
        }
        echo "태스크 $key 완료\n";
    }
});
```

### 예제 #2 이름 있는 키로 반복

```php
<?php

use Async\TaskGroup;

spawn(function() {
    $group = new TaskGroup();

    $group->spawnWithKey('users', fn() => fetchUsers());
    $group->spawnWithKey('orders', fn() => fetchOrders());
    $group->seal();

    foreach ($group as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: " . count($result) . "개 레코드 수신\n";
        }
    }
});
```

## 참고

- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) --- 그룹 봉인
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) --- 모든 태스크 대기
- [TaskGroup::getResults](/ko/docs/reference/task-group/get-results.html) --- 결과 배열 가져오기
