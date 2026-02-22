---
layout: docs
lang: ko
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /ko/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Future가 완료되었는지 확인합니다."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

`Future`가 완료되었는지 확인합니다. Future는 결과, 오류를 포함하거나 취소된 경우 완료된 것으로 간주됩니다.

## 반환값

`bool` — Future가 완료된 경우(성공, 오류 또는 취소) `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 Future 완료 확인

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### 예제 #2 정적 팩토리 메서드 확인

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## 같이 보기

- [Future::isCancelled](/ko/docs/reference/future/is-cancelled.html) — Future가 취소되었는지 확인
- [Future::await](/ko/docs/reference/future/await.html) — Future 결과 대기
