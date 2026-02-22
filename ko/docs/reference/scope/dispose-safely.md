---
layout: docs
lang: ko
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /ko/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "스코프를 안전하게 닫습니다 — 코루틴이 좀비가 됩니다."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

스코프를 안전하게 닫습니다. 활성 코루틴은 **취소되지 않고** 대신 좀비 코루틴이 됩니다: 계속 실행되지만 스코프는 닫힌 것으로 간주됩니다. 좀비 코루틴은 작업을 완료하면 자체적으로 종료됩니다.

스코프가 `asNotSafely()`를 통해 "안전하지 않음"으로 표시된 경우, 코루틴은 좀비가 되는 대신 취소됩니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// 스코프는 닫히지만 코루틴은 계속 실행됩니다
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// 코루틴은 백그라운드에서 계속 실행됩니다
```

### 예제 #2 좀비 대기를 포함한 우아한 종료

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// 좀비 코루틴이 완료될 때까지 대기
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## 참고

- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프를 강제로 닫기
- [Scope::asNotSafely](/ko/docs/reference/scope/as-not-safely.html) — 좀비 동작 비활성화
- [Scope::awaitAfterCancellation](/ko/docs/reference/scope/await-after-cancellation.html) — 좀비 코루틴 대기
