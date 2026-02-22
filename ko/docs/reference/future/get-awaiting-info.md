---
layout: docs
lang: ko
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /ko/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "대기 중인 코루틴에 대한 디버그 정보입니다."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

현재 이 `Future`의 완료를 대기하고 있는 코루틴에 대한 디버그 정보를 반환합니다. 데드락 진단 및 코루틴 간 의존성 분석에 유용합니다.

## 반환값

`array` — 대기 중인 코루틴에 대한 정보가 담긴 배열.

## 예제

### 예제 #1 대기자 정보 가져오기

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// 하나의 Future를 대기하는 여러 코루틴 실행
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// 코루틴이 대기를 시작할 시간을 줌
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// 대기 중인 코루틴에 대한 정보가 담긴 배열

$state->complete("done");
```

## 같이 보기

- [Future::getCreatedFileAndLine](/ko/docs/reference/future/get-created-file-and-line.html) — Future 생성 위치
- [Future::getCreatedLocation](/ko/docs/reference/future/get-created-location.html) — 문자열로 된 생성 위치
- [Future::await](/ko/docs/reference/future/await.html) — 결과 대기
