---
layout: docs
lang: ko
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /ko/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "지정된 타임아웃 후 스코프를 닫습니다."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

지정된 타임아웃 후 스코프가 닫히도록 예약합니다. 타임아웃이 만료되면 `dispose()`가 호출되어 모든 코루틴을 취소하고 스코프를 닫습니다. 이는 스코프의 최대 수명을 설정하는 데 편리합니다.

## 매개변수

`timeout` — 스코프가 자동으로 닫히기까지의 시간(밀리초).

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 실행 시간 제한

```php
<?php

use Async\Scope;

$scope = new Scope();

// 스코프는 10초 후에 닫힙니다
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // 긴 작업
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Task cancelled by scope timeout\n";
    }
});

$scope->awaitCompletion();
```

### 예제 #2 제한된 수명을 가진 스코프

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 모든 작업에 5초

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // 시간 내에 완료되지 않음
    echo "Task 3: OK\n"; // 출력되지 않음
});

$scope->awaitCompletion();
```

## 참고

- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 즉시 스코프 닫기
- [Scope::disposeSafely](/ko/docs/reference/scope/dispose-safely.html) — 안전한 스코프 닫기
- [timeout()](/ko/docs/reference/timeout.html) — 전역 타임아웃 함수
