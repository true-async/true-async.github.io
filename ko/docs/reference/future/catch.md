---
layout: docs
lang: ko
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /ko/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Future 오류를 처리합니다."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

`Future`에 대한 오류 핸들러를 등록합니다. Future가 예외로 완료된 경우 콜백이 호출됩니다. 콜백이 값을 반환하면 새 Future의 결과가 됩니다. 콜백이 예외를 던지면 새 Future는 해당 오류로 완료됩니다.

## 매개변수

`catch` — 오류 처리 함수. `Throwable`을 수신하며, 복구를 위한 값을 반환할 수 있습니다. 시그니처: `function(\Throwable $e): mixed`.

## 반환값

`Future` — 오류 처리 결과를 가진 새 Future. 오류가 없었다면 원래 값을 가진 Future.

## 예제

### 예제 #1 복구를 통한 오류 처리

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recovery
    });

$result = $future->await();
echo $result; // default value
```

### 예제 #2 비동기 작업에서 오류 잡기

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Log the error and return an empty array
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## 같이 보기

- [Future::map](/ko/docs/reference/future/map.html) — Future 결과 변환
- [Future::finally](/ko/docs/reference/future/finally.html) — Future 완료 시 콜백
- [Future::ignore](/ko/docs/reference/future/ignore.html) — 처리되지 않은 오류 무시
