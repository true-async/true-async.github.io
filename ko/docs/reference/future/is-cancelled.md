---
layout: docs
lang: ko
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /ko/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Future가 취소되었는지 확인합니다."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

`Future`가 취소되었는지 확인합니다. `cancel()` 메서드가 호출된 후 Future는 취소된 것으로 간주됩니다.

## 반환값

`bool` — Future가 취소된 경우 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 Future 취소 확인

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### 예제 #2 완료와 취소의 차이

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## 같이 보기

- [Future::cancel](/ko/docs/reference/future/cancel.html) — Future 취소
- [Future::isCompleted](/ko/docs/reference/future/is-completed.html) — Future가 완료되었는지 확인
