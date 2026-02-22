---
layout: docs
lang: ko
path_key: "/docs/reference/future/await.html"
nav_active: docs
permalink: /ko/docs/reference/future/await.html
page_title: "Future::await"
description: "Future의 결과를 대기합니다."
---

# Future::await

(PHP 8.6+, True Async 1.0)

```php
public function await(?Completable $cancellation = null): mixed
```

`Future`의 완료를 대기하고 결과를 반환합니다. Future가 완료될 때까지 현재 코루틴을 차단합니다. Future가 오류로 완료된 경우, 해당 예외가 발생합니다. 타임아웃이나 외부 조건으로 대기를 취소하기 위해 `Completable`을 전달할 수 있습니다.

## 매개변수

`cancellation` — 대기 취소 객체. 제공된 경우 Future가 완료되기 전에 트리거되면 `CancelledException`가 발생합니다. 기본값은 `null`입니다.

## 반환값

`mixed` — Future의 결과.

## 오류

Future가 오류로 완료되었거나 취소된 경우 예외를 발생시킵니다.

## 예제

### 예제 #1 기본 결과 대기

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    \Async\delay(100);
    return 42;
});

$result = $future->await();
echo "Result: $result\n"; // Result: 42
```

### 예제 #2 대기 중 오류 처리

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    throw new \RuntimeException("Something went wrong");
});

try {
    $result = $future->await();
} catch (\RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Error: Something went wrong
}
```

## 같이 보기

- [Future::isCompleted](/ko/docs/reference/future/is-completed.html) — Future가 완료되었는지 확인
- [Future::cancel](/ko/docs/reference/future/cancel.html) — Future 취소
- [Future::map](/ko/docs/reference/future/map.html) — 결과 변환
