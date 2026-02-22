---
layout: docs
lang: ko
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /ko/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Future 완료 시 항상 실행되는 콜백입니다."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

`Future`가 완료될 때 결과에 관계없이 실행되는 콜백을 등록합니다 --- 성공, 오류 또는 취소 모두 해당됩니다. Future는 원래와 동일한 값 또는 오류로 해결됩니다. 리소스 해제에 유용합니다.

## 매개변수

`finally` — 완료 시 실행할 함수. 인수를 받지 않습니다. 시그니처: `function(): void`.

## 반환값

`Future` — 원래와 동일한 값 또는 오류로 완료되는 새 Future.

## 예제

### 예제 #1 리소스 해제

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### 예제 #2 map, catch, finally 체이닝

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## 같이 보기

- [Future::map](/ko/docs/reference/future/map.html) — Future 결과 변환
- [Future::catch](/ko/docs/reference/future/catch.html) — Future 오류 처리
- [Future::ignore](/ko/docs/reference/future/ignore.html) — 처리되지 않은 오류 무시
