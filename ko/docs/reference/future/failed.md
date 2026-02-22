---
layout: docs
lang: ko
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /ko/docs/reference/future/failed.html
page_title: "Future::failed"
description: "오류로 완료된 Future를 생성합니다."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

지정된 오류로 즉시 완료된 `Future`를 생성합니다. 이러한 Future에 `await()`를 호출하면 제공된 예외가 발생합니다.

## 매개변수

`throwable` — Future가 완료될 예외.

## 반환값

`Future` — 오류로 완료된 Future.

## 예제

### 예제 #1 오류를 가진 Future 생성

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### 예제 #2 조기 오류 반환에 사용

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## 같이 보기

- [Future::completed](/ko/docs/reference/future/completed.html) — 결과를 가진 Future 생성
- [Future::catch](/ko/docs/reference/future/catch.html) — Future 오류 처리
- [Future::await](/ko/docs/reference/future/await.html) — 결과 대기
