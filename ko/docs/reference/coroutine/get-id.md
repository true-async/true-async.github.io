---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-id.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-id.html
page_title: "Coroutine::getId"
description: "코루틴의 고유 식별자를 가져옵니다."
---

# Coroutine::getId

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getId(): int
```

코루틴의 고유 정수 식별자를 반환합니다. 식별자는 현재 PHP 프로세스 내에서 고유합니다.

## 반환값

`int` -- 고유한 코루틴 식별자.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use function Async\spawn;

$coroutine1 = spawn(function() {
    return "task 1";
});

$coroutine2 = spawn(function() {
    return "task 2";
});

$id1 = $coroutine1->getId();
$id2 = $coroutine2->getId();

var_dump(is_int($id1));     // bool(true)
var_dump($id1 !== $id2);    // bool(true)
```

### 예제 #2 식별자를 사용한 로깅

```php
<?php

use function Async\spawn;

function loggedTask(string $name): \Async\Coroutine {
    return spawn(function() use ($name) {
        $id = \Async\current_coroutine()->getId();
        echo "[coro:$id] Task '$name' started\n";
        \Async\delay(1000);
        echo "[coro:$id] Task '$name' completed\n";
    });
}
```

## 같이 보기

- [Coroutine::getSpawnLocation](/ko/docs/reference/coroutine/get-spawn-location.html) -- 코루틴 생성 위치
- [current_coroutine()](/ko/docs/reference/current-coroutine.html) -- 현재 코루틴 가져오기
