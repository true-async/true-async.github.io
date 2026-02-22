---
layout: docs
lang: ko
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /ko/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "처리되지 않은 오류를 이벤트 루프 핸들러로 전파하지 않습니다."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

`Future`를 무시됨으로 표시합니다. Future가 오류로 완료되었으나 오류가 처리되지 않은 경우, 이벤트 루프의 처리되지 않은 예외 핸들러로 전달되지 않습니다. 결과가 중요하지 않은 "실행 후 잊기" 작업에 유용합니다.

## 반환값

`Future` — 메서드 체이닝을 위해 동일한 Future를 반환합니다.

## 예제

### 예제 #1 Future 오류 무시

```php
<?php

use Async\Future;

// 오류를 신경 쓰지 않는 작업 실행
\Async\async(function() {
    // 이 작업은 실패할 수 있음
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// 오류가 이벤트 루프 핸들러로 전달되지 않음
```

### 예제 #2 메서드 체이닝에서 ignore 사용

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // 캐시 오류는 치명적이지 않음
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## 같이 보기

- [Future::catch](/ko/docs/reference/future/catch.html) — Future 오류 처리
- [Future::finally](/ko/docs/reference/future/finally.html) — Future 완료 시 콜백
