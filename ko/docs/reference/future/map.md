---
layout: docs
lang: ko
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /ko/docs/reference/future/map.html
page_title: "Future::map"
description: "Future 결과를 변환합니다."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

콜백 함수를 사용하여 `Future` 결과를 변환합니다. 콜백은 완료된 Future의 값을 수신하고 새 값을 반환합니다. Promise 기반 API의 `then()`과 유사합니다. 원래 Future가 오류로 완료된 경우 콜백은 호출되지 않으며, 오류가 새 Future로 전달됩니다.

## 매개변수

`map` — 변환 함수. Future 결과를 수신하고 새 값을 반환합니다. 시그니처: `function(mixed $value): mixed`.

## 반환값

`Future` — 변환된 결과를 포함하는 새 Future.

## 예제

### 예제 #1 결과 변환

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### 예제 #2 비동기 로딩의 변환 체인

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## 같이 보기

- [Future::catch](/ko/docs/reference/future/catch.html) — Future 오류 처리
- [Future::finally](/ko/docs/reference/future/finally.html) — Future 완료 시 콜백
- [Future::await](/ko/docs/reference/future/await.html) — 결과 대기
