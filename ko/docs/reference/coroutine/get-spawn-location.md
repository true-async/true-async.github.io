---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "코루틴 생성 위치를 문자열로 가져옵니다."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

코루틴 생성 위치를 `"file:line"` 형식으로 반환합니다. 정보를 사용할 수 없는 경우 `"unknown"`을 반환합니다.

## 반환값

`string` -- `"/app/script.php:42"` 또는 `"unknown"` 형태의 문자열.

## 예제

### 예제 #1 디버그 출력

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### 예제 #2 모든 코루틴 로깅

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## 같이 보기

- [Coroutine::getSpawnFileAndLine](/ko/docs/reference/coroutine/get-spawn-file-and-line.html) -- 배열 형태의 파일과 줄 번호
- [Coroutine::getSuspendLocation](/ko/docs/reference/coroutine/get-suspend-location.html) -- 일시 중단 위치
- [get_coroutines()](/ko/docs/reference/get-coroutines.html) -- 모든 활성 코루틴
