---
layout: docs
lang: ko
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /ko/docs/reference/future/completed.html
page_title: "Future::completed"
description: "결과를 가진 이미 완료된 Future를 생성합니다."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

지정된 값으로 이미 완료된 `Future`를 생성합니다. 결과를 즉시 포함하는 `Future`를 반환하는 팩토리 메서드입니다. `Future`를 반환하는 함수에서 이미 알려진 값을 반환하는 데 유용합니다.

## 매개변수

`value` — Future가 완료될 값. 기본값은 `null`입니다.

## 반환값

`Future` — 지정된 값으로 완료된 Future.

## 예제

### 예제 #1 준비된 값으로 Future 생성

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### 예제 #2 Future를 반환하는 함수에서 사용

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // 데이터가 캐시에 있으면 즉시 반환
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // 그렇지 않으면 비동기 작업 시작
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## 같이 보기

- [Future::failed](/ko/docs/reference/future/failed.html) — 오류를 가진 Future 생성
- [Future::__construct](/ko/docs/reference/future/construct.html) — FutureState를 통해 Future 생성
- [Future::await](/ko/docs/reference/future/await.html) — 결과 대기
