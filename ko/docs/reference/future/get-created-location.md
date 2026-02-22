---
layout: docs
lang: ko
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /ko/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "문자열로 된 Future 생성 위치입니다."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

`Future` 생성 위치에 대한 정보를 포맷된 문자열로 반환합니다. 로깅 및 디버그 출력에 편리합니다.

## 반환값

`string` — `file:line` 형식의 문자열, 예: `/app/script.php:42`.

## 예제

### 예제 #1 문자열로 생성 위치 가져오기

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### 예제 #2 디버그 메시지에서 사용

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// 오래 실행되는 Future 디버깅
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## 같이 보기

- [Future::getCreatedFileAndLine](/ko/docs/reference/future/get-created-file-and-line.html) — 배열로 된 생성 위치
- [Future::getCompletedLocation](/ko/docs/reference/future/get-completed-location.html) — 문자열로 된 완료 위치
- [Future::getAwaitingInfo](/ko/docs/reference/future/get-awaiting-info.html) — 대기자 정보
