---
layout: docs
lang: ko
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /ko/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "스코프 취소 후 좀비를 포함한 모든 코루틴의 완료를 대기합니다."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

좀비 코루틴을 포함하여 스코프 내 **모든** 코루틴의 완료를 대기합니다. 사전에 `cancel()` 호출이 필요합니다. 이 메서드는 모든 코루틴(좀비 포함)이 작업을 완료할 때까지 대기해야 할 때 스코프의 우아한 종료에 사용됩니다.

## 매개변수

`errorHandler` — 좀비 코루틴 오류를 처리하기 위한 콜백 함수. `\Throwable`을 인수로 받습니다. `null`이면 오류가 무시됩니다.

`cancellation` — 대기를 중단하기 위한 `Awaitable` 객체. `null`이면 대기 시간 제한이 없습니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 오류 처리를 포함한 우아한 종료

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// 먼저 취소
$scope->cancel();

// 그런 다음 모든 코루틴이 완료될 때까지 대기
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### 예제 #2 타임아웃을 사용한 대기

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // 완료하는 데 오래 걸리는 좀비 코루틴
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // 리소스 정리
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## 참고

- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 모든 코루틴 취소
- [Scope::awaitCompletion](/ko/docs/reference/scope/await-completion.html) — 활성 코루틴 대기
- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프 취소 및 닫기
