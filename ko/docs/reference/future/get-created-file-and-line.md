---
layout: docs
lang: ko
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /ko/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "배열로 된 Future 생성 위치입니다."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

`Future` 생성 위치에 대한 정보를 배열로 반환합니다. 이 Future가 생성된 파일 이름과 줄 번호를 포함합니다. 디버깅 및 추적에 유용합니다.

## 반환값

`array` — `file`(문자열, 파일 경로)와 `line`(정수, 줄 번호) 키를 가진 배열.

## 예제

### 예제 #1 생성 위치 가져오기

```php
<?php

use Async\Future;

$future = Future::completed(42); // line 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### 예제 #2 Future 정보 로깅

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## 같이 보기

- [Future::getCreatedLocation](/ko/docs/reference/future/get-created-location.html) — 문자열로 된 생성 위치
- [Future::getCompletedFileAndLine](/ko/docs/reference/future/get-completed-file-and-line.html) — Future 완료 위치
- [Future::getAwaitingInfo](/ko/docs/reference/future/get-awaiting-info.html) — 대기자 정보
