---
layout: docs
lang: ko
path_key: "/docs/reference/current-coroutine.html"
nav_active: docs
permalink: /ko/docs/reference/current-coroutine.html
page_title: "current_coroutine()"
description: "current_coroutine() — 현재 실행 중인 코루틴 객체를 가져옵니다."
---

# current_coroutine

(PHP 8.6+, True Async 1.0)

`current_coroutine()` — 현재 실행 중인 코루틴 객체를 반환합니다.

## 설명

```php
current_coroutine(): Async\Coroutine
```

## 반환 값

현재 코루틴을 나타내는 `Async\Coroutine` 객체입니다.

## 오류/예외

`Async\AsyncException` — 코루틴 외부에서 호출된 경우.

## 예제

### 예제 #1 코루틴 ID 가져오기

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();
    echo "Coroutine #" . $coro->getId() . "\n";
});
?>
```

### 예제 #2 진단

```php
<?php
use function Async\spawn;
use function Async\current_coroutine;

spawn(function() {
    $coro = current_coroutine();

    echo "생성 위치: " . $coro->getSpawnLocation() . "\n";
    echo "상태: " . ($coro->isRunning() ? '실행 중' : '일시 중단') . "\n";
});
?>
```

## 같이 보기

- [get_coroutines()](/ko/docs/reference/get-coroutines.html) — 모든 코루틴 목록
- [Coroutines](/ko/docs/components/coroutines.html) — 코루틴 개념
