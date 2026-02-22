---
layout: docs
lang: ko
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /ko/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "배열로 된 Future 완료 위치입니다."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

`Future`가 완료된 위치(연관된 `FutureState`에서 `complete()` 또는 `fail()`이 호출된 곳)에 대한 정보를 반환합니다. 파일 이름과 줄 번호를 포함합니다. 디버깅 및 비동기 체인 추적에 유용합니다.

## 반환값

`array` — `file`(문자열, 파일 경로)와 `line`(정수, 줄 번호) 키를 가진 배열. Future가 아직 완료되지 않은 경우 빈 배열을 반환합니다.

## 예제

### 예제 #1 완료 위치 가져오기

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // line 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### 예제 #2 생성 위치와 완료 위치 비교

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## 같이 보기

- [Future::getCompletedLocation](/ko/docs/reference/future/get-completed-location.html) — 문자열로 된 완료 위치
- [Future::getCreatedFileAndLine](/ko/docs/reference/future/get-created-file-and-line.html) — Future 생성 위치
- [Future::getAwaitingInfo](/ko/docs/reference/future/get-awaiting-info.html) — 대기자 정보
