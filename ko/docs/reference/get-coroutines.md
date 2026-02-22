---
layout: docs
lang: ko
path_key: "/docs/reference/get-coroutines.html"
nav_active: docs
permalink: /ko/docs/reference/get-coroutines.html
page_title: "get_coroutines()"
description: "get_coroutines() — 진단을 위해 모든 활성 코루틴 목록을 가져옵니다."
---

# get_coroutines

(PHP 8.6+, True Async 1.0)

`get_coroutines()` — 모든 활성 코루틴의 배열을 반환합니다. 진단 및 모니터링에 유용합니다.

## 설명

```php
get_coroutines(): array
```

## 반환 값

현재 요청에 등록된 모든 코루틴인 `Async\Coroutine` 객체의 배열입니다.

## 예제

### 예제 #1 코루틴 모니터링

```php
<?php
use function Async\spawn;
use function Async\get_coroutines;
use function Async\delay;

spawn(function() { delay(10000); });
spawn(function() { delay(10000); });

// 코루틴이 시작될 때까지 대기
delay(10);

foreach (get_coroutines() as $coro) {
    echo sprintf(
        "Coroutine #%d: %s, 생성 위치: %s\n",
        $coro->getId(),
        $coro->isSuspended() ? '일시 중단' : '실행 중',
        $coro->getSpawnLocation()
    );
}
?>
```

### 예제 #2 누수 감지

```php
<?php
use function Async\get_coroutines;

// 요청 끝에서 미완료 코루틴을 확인합니다
$active = get_coroutines();
if (count($active) > 0) {
    foreach ($active as $coro) {
        error_log("미완료 코루틴: " . $coro->getSpawnLocation());
    }
}
?>
```

## 같이 보기

- [current_coroutine()](/ko/docs/reference/current-coroutine.html) — 현재 코루틴
- [Coroutines](/ko/docs/components/coroutines.html) — 코루틴 개념
