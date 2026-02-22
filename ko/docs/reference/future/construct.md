---
layout: docs
lang: ko
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /ko/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "FutureState에 바인딩된 Future를 생성합니다."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

`FutureState` 객체에 바인딩된 새 `Future`를 생성합니다. `FutureState`는 Future의 상태를 관리하며 외부에서 결과나 오류로 완료할 수 있게 합니다.

## 매개변수

`state` — 이 Future의 상태를 관리하는 `FutureState` 객체.

## 예제

### 예제 #1 FutureState를 통해 Future 생성

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// 다른 코루틴에서 Future 완료
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// 결과 대기
$value = $future->await();
echo "Received: $value\n";
```

### 예제 #2 지연된 결과로 Future 생성

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// 하나의 코루틴이 결과를 대기
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Result: $result\n";
});

// 다른 코루틴이 결과를 제공
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Done!");
});
```

## 같이 보기

- [Future::completed](/ko/docs/reference/future/completed.html) — 이미 완료된 Future 생성
- [Future::failed](/ko/docs/reference/future/failed.html) — 오류를 가진 Future 생성
