---
layout: docs
lang: ko
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /ko/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "문자열로 된 Future 완료 위치입니다."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

`Future` 완료 위치에 대한 정보를 포맷된 문자열로 반환합니다. 로깅 및 디버깅에 편리합니다.

## 반환값

`string` — `file:line` 형식의 문자열, 예: `/app/worker.php:15`. Future가 아직 완료되지 않은 경우 빈 문자열을 반환합니다.

## 예제

### 예제 #1 문자열로 완료 위치 가져오기

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### 예제 #2 Future 전체 생명주기 추적

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## 같이 보기

- [Future::getCompletedFileAndLine](/ko/docs/reference/future/get-completed-file-and-line.html) — 배열로 된 완료 위치
- [Future::getCreatedLocation](/ko/docs/reference/future/get-created-location.html) — 문자열로 된 생성 위치
- [Future::getAwaitingInfo](/ko/docs/reference/future/get-awaiting-info.html) — 대기자 정보
