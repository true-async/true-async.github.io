---
layout: docs
lang: ko
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /ko/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "모든 코루틴을 취소하고 스코프를 닫습니다."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

스코프 내 모든 코루틴을 강제로 취소하고 스코프를 닫습니다. `dispose()`를 호출한 후 스코프는 닫힘 및 취소됨으로 표시됩니다. 닫힌 스코프에는 새로운 코루틴을 추가할 수 없습니다.

이는 `cancel()`을 호출한 후 스코프를 닫는 것과 동일합니다.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 스코프 강제 닫기

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// 모든 코루틴이 취소되고 스코프가 닫힙니다
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### 예제 #2 try/finally 블록에서의 정리

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // 비즈니스 로직
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## 참고

- [Scope::disposeSafely](/ko/docs/reference/scope/dispose-safely.html) — 안전한 닫기 (좀비 사용)
- [Scope::disposeAfterTimeout](/ko/docs/reference/scope/dispose-after-timeout.html) — 타임아웃 후 닫기
- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 스코프를 닫지 않고 취소
