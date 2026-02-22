---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "코루틴의 일시 중단 위치를 문자열로 가져옵니다."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

코루틴의 일시 중단 위치를 `"file:line"` 형식으로 반환합니다. 정보를 사용할 수 없는 경우 `"unknown"`을 반환합니다.

## 반환값

`string` -- `"/app/script.php:42"` 또는 `"unknown"` 형태의 문자열.

## 예제

### 예제 #1 멈춘 코루틴 진단

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // stuck here
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## 같이 보기

- [Coroutine::getSuspendFileAndLine](/ko/docs/reference/coroutine/get-suspend-file-and-line.html) -- 배열 형태의 파일과 줄 번호
- [Coroutine::getSpawnLocation](/ko/docs/reference/coroutine/get-spawn-location.html) -- 생성 위치
- [Coroutine::getTrace](/ko/docs/reference/coroutine/get-trace.html) -- 전체 호출 스택
