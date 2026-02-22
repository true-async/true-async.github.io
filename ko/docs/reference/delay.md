---
layout: docs
lang: ko
path_key: "/docs/reference/delay.html"
nav_active: docs
permalink: /ko/docs/reference/delay.html
page_title: "delay()"
description: "delay() — 지정된 밀리초 동안 코루틴을 일시 중단합니다."
---

# delay

(PHP 8.6+, True Async 1.0)

`delay()` — 지정된 밀리초 동안 현재 코루틴의 실행을 일시 중단합니다.

## 설명

```php
delay(int $ms): void
```

코루틴을 일시 중단하고 스케줄러에 제어를 양보합니다. `$ms` 밀리초 후에 코루틴이 재개됩니다.
대기 중에도 다른 코루틴은 계속 실행됩니다.

## 매개변수

**`ms`**
밀리초 단위의 대기 시간입니다. `0`이면 코루틴은 단순히 스케줄러에 제어를 양보합니다(`suspend()`와 유사하지만 큐잉 포함).

## 반환 값

반환 값이 없습니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    echo "Start\n";
    delay(1000); // 1초 대기
    echo "1 second passed\n";
});
?>
```

### 예제 #2 주기적 실행

```php
<?php
use function Async\spawn;
use function Async\delay;

spawn(function() {
    while (true) {
        echo "상태 확인 중...\n";
        delay(5000); // 5초마다
    }
});
?>
```

## 참고

> **참고:** `delay()`는 전체 PHP 프로세스를 차단하지 않습니다 — 현재 코루틴만 차단됩니다.

> **참고:** `delay()`는 스케줄러가 아직 시작되지 않은 경우 자동으로 시작합니다.

## 같이 보기

- [suspend()](/ko/docs/reference/suspend.html) — 지연 없이 제어 양보
- [timeout()](/ko/docs/reference/timeout.html) — 대기 시간을 제한하는 타임아웃 생성
