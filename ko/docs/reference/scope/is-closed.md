---
layout: docs
lang: ko
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "스코프가 닫혔는지 확인합니다."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

스코프가 닫혔는지 확인합니다. 스코프는 `dispose()` 또는 `disposeSafely()` 호출 후 닫힌 것으로 간주됩니다. 닫힌 스코프에는 새로운 코루틴을 추가할 수 없습니다.

## 반환값

`bool` — 스코프가 닫힌 경우 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 스코프 상태 확인

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### 예제 #2 닫힌 스코프에 추가 방지

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## 참고

- [Scope::isFinished](/ko/docs/reference/scope/is-finished.html) — 스코프 완료 여부 확인
- [Scope::isCancelled](/ko/docs/reference/scope/is-cancelled.html) — 스코프 취소 여부 확인
- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프 닫기
