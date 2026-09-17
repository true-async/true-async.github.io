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

스코프를 닫고 그 안의 모든 코루틴을 취소합니다. `dispose()`를 호출한 후 스코프는 닫힘 및 취소됨으로 표시됩니다. 닫힌 스코프에는 새로운 코루틴을 추가할 수 없습니다.

dispose-safely 플래그가 없는 스코프(기본값인 `new Scope()`)에서는 `cancel()`을 호출한 후 스코프를 닫는 것과 동일합니다. 이 플래그를 가진 스코프 -- `allowZombies()`로 설정했거나, 메인 스코프처럼 이 플래그를 가진 부모로부터 상속받은 경우 -- 는 코루틴을 취소하는 대신 `disposeSafely()`와 마찬가지로 좀비 상태로 계속 실행되도록 둡니다.

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
    } catch (\Async\AsyncCancellation) {
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

    $scope->awaitCompletion(Async\timeout(5000));
} finally {
    $scope->dispose();
}
```

## 참고

- [Scope::disposeSafely](/ko/docs/reference/scope/dispose-safely.html) — 안전한 닫기 (좀비 사용)
- [Scope::disposeAfterTimeout](/ko/docs/reference/scope/dispose-after-timeout.html) — 타임아웃 후 닫기
- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 스코프를 닫지 않고 취소
