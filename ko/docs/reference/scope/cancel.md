---
layout: docs
lang: ko
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "스코프 내 모든 코루틴을 취소합니다."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

해당 스코프에 속한 모든 코루틴을 취소합니다. 각 활성 코루틴은 `CancelledException`을 받게 됩니다. `$cancellationError`가 지정되면 취소 사유로 사용됩니다.

## 매개변수

`cancellationError` — 사용자 정의 취소 예외. `null`이면 표준 `CancelledException`이 사용됩니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 기본 취소

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // 긴 작업
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// 모든 코루틴 취소
$scope->cancel();
```

### 예제 #2 사용자 정의 오류를 사용한 취소

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## 참고

- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프 취소 및 닫기
- [Scope::isCancelled](/ko/docs/reference/scope/is-cancelled.html) — 스코프 취소 여부 확인
- [Scope::awaitAfterCancellation](/ko/docs/reference/scope/await-after-cancellation.html) — 취소 후 대기
