---
layout: docs
lang: ko
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /ko/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "스코프가 취소되었는지 확인합니다."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

스코프가 취소되었는지 확인합니다. 스코프는 `cancel()` 또는 `dispose()` 호출 후 취소됨으로 표시됩니다.

## 반환값

`bool` — 스코프가 취소된 경우 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 스코프 취소 확인

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## 참고

- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 스코프 취소
- [Scope::isFinished](/ko/docs/reference/scope/is-finished.html) — 스코프 완료 여부 확인
- [Scope::isClosed](/ko/docs/reference/scope/is-closed.html) — 스코프 닫힘 여부 확인
