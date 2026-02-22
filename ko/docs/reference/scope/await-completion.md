---
layout: docs
lang: ko
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /ko/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "스코프 내 활성 코루틴의 완료를 대기합니다."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

스코프 내 모든 **활성** 코루틴의 완료를 대기합니다. 좀비 코루틴은 대기 시 고려되지 않습니다. `$cancellation` 매개변수를 사용하면 대기를 조기에 중단할 수 있습니다.

## 매개변수

`cancellation` — 트리거되면 대기를 중단하는 `Awaitable` 객체.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 모든 코루틴 완료 대기

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// 5초 타임아웃으로 완료 대기
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### 예제 #2 대기 중단

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // 매우 긴 작업
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## 참고

- [Scope::awaitAfterCancellation](/ko/docs/reference/scope/await-after-cancellation.html) — 좀비를 포함한 모든 코루틴 대기
- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 모든 코루틴 취소
- [Scope::isFinished](/ko/docs/reference/scope/is-finished.html) — 스코프 완료 여부 확인
