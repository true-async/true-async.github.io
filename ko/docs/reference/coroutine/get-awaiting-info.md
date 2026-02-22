---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "코루틴이 대기 중인 대상에 대한 정보를 가져옵니다."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

코루틴이 현재 대기 중인 대상에 대한 디버그 정보를 반환합니다. 멈춘 코루틴을 진단하는 데 유용합니다.

## 반환값

`array` -- 대기 정보가 담긴 배열입니다. 정보를 사용할 수 없는 경우 빈 배열을 반환합니다.

## 예제

### 예제 #1 대기 상태 진단

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## 같이 보기

- [Coroutine::isSuspended](/ko/docs/reference/coroutine/is-suspended.html) -- 일시 중단 확인
- [Coroutine::getTrace](/ko/docs/reference/coroutine/get-trace.html) -- 호출 스택
- [Coroutine::getSuspendLocation](/ko/docs/reference/coroutine/get-suspend-location.html) -- 일시 중단 위치
