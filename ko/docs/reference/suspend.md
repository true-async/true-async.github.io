---
layout: docs
lang: ko
path_key: "/docs/reference/suspend.html"
nav_active: docs
permalink: /ko/docs/reference/suspend.html
page_title: "suspend()"
description: "suspend() — 현재 코루틴의 실행을 일시 중단합니다. 전체 문서: 협력적 멀티태스킹 예제."
---

# suspend

(PHP 8.6+, True Async 1.0)

`suspend()` — 현재 코루틴의 실행을 일시 중단합니다

## 설명

```php
suspend: void
```

현재 코루틴의 실행을 일시 중단하고 스케줄러에 제어를 양보합니다.
코루틴의 실행은 스케줄러가 실행을 결정하면 나중에 재개됩니다.

`suspend()`는 True Async 확장이 제공하는 함수입니다.

## 매개변수

이 구문에는 매개변수가 없습니다.

## 반환 값

이 함수는 값을 반환하지 않습니다.

## 예제

### 예제 #1 suspend의 기본 사용법

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Before suspend\n";
    suspend();
    echo "After suspend\n";
});

echo "Main code\n";
?>
```

**출력:**
```
Before suspend
Main code
After suspend
```

### 예제 #2 다중 suspend

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 3; $i++) {
        echo "Iteration $i\n";
        suspend();
    }
});

echo "Coroutine started\n";
?>
```

**출력:**
```
Iteration 1
Coroutine started
Iteration 2
Iteration 3
```

### 예제 #3 협력적 멀티태스킹

```php
<?php
use function Async\spawn;

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine A: $i\n";
        suspend(); // 다른 코루틴에 실행 기회를 줍니다
    }
});

spawn(function() {
    for ($i = 1; $i <= 5; $i++) {
        echo "Coroutine B: $i\n";
        suspend();
    }
});
?>
```

**출력:**
```
Coroutine A: 1
Coroutine B: 1
Coroutine A: 2
Coroutine B: 2
Coroutine A: 3
Coroutine B: 3
...
```

### 예제 #4 명시적 제어 양보

```php
<?php
use function Async\spawn;

spawn(function() {
    echo "Starting long work\n";

    for ($i = 0; $i < 1000000; $i++) {
        // 계산

        if ($i % 100000 === 0) {
            suspend(); // 주기적으로 제어를 양보합니다
        }
    }

    echo "Work completed\n";
});

spawn(function() {
    echo "Other coroutine is also working\n";
});
?>
```

### 예제 #5 중첩된 함수에서의 suspend

`suspend()`는 모든 호출 깊이에서 동작합니다 — 코루틴에서 직접 호출할 필요가 없습니다:

```php
<?php
use function Async\spawn;

function nestedSuspend() {
    echo "Nested function: before suspend\n";
    suspend();
    echo "Nested function: after suspend\n";
}

function deeplyNested() {
    echo "Deep call: start\n";
    nestedSuspend();
    echo "Deep call: end\n";
}

spawn(function() {
    echo "Coroutine: before nested call\n";
    deeplyNested();
    echo "Coroutine: after nested call\n";
});

spawn(function() {
    echo "Other coroutine: working\n";
});
?>
```

**출력:**
```
Coroutine: before nested call
Deep call: start
Nested function: before suspend
Other coroutine: working
Nested function: after suspend
Deep call: end
Coroutine: after nested call
```

### 예제 #6 대기 루프에서의 suspend

```php
<?php
use function Async\spawn;

$ready = false;

spawn(function() use (&$ready) {
    // 플래그가 true가 될 때까지 대기합니다
    while (!$ready) {
        suspend(); // 제어 양보
    }

    echo "Condition met!\n";
});

spawn(function() use (&$ready) {
    echo "Preparing...\n";
    Async\sleep(2000);
    $ready = true;
    echo "Ready!\n";
});
?>
```

**출력:**
```
Preparing...
Ready!
Condition met!
```

## 참고

> **참고:** `suspend()`는 함수입니다. `suspend`(괄호 없이) 호출하는 것은 잘못된 사용입니다.

> **참고:** TrueAsync에서 실행 중인 모든 코드는 코루틴으로 취급되므로,
> `suspend()`는 메인 스크립트를 포함하여 어디서든 호출할 수 있습니다.

> **참고:** `suspend()` 호출 후, 코루틴 실행은 즉시 재개되지 않고
> 스케줄러가 실행을 결정할 때 재개됩니다. 코루틴 재개 순서는 보장되지 않습니다.

> **참고:** 대부분의 경우 `suspend()`의 명시적 사용은 필요하지 않습니다.
> 코루틴은 I/O 작업(파일 읽기, 네트워크 요청 등)을 수행할 때
> 자동으로 일시 중단됩니다.

> **참고:** I/O 작업 없는 무한 루프에서 `suspend()`를 사용하면
> 높은 CPU 사용률이 발생할 수 있습니다.
> `Async\timeout()`을 사용할 수도 있습니다.

## 변경 이력

| 버전    | 설명                              |
|---------|----------------------------------|
| 1.0.0   | `suspend()` 함수가 추가되었습니다  |

## 같이 보기

- [spawn()](/ko/docs/reference/spawn.html) - 코루틴 실행
- [await()](/ko/docs/reference/await.html) - 코루틴 결과 대기
