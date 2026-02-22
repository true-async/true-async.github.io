---
layout: docs
lang: ko
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /ko/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "스코프가 완료되었는지 확인합니다."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

스코프 내 모든 코루틴이 완료되었는지 확인합니다. 스코프는 모든 코루틴(자식 스코프 포함)이 실행을 완료했을 때 완료된 것으로 간주됩니다.

## 반환값

`bool` — 스코프의 모든 코루틴이 완료된 경우 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 스코프 완료 확인

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## 참고

- [Scope::isClosed](/ko/docs/reference/scope/is-closed.html) — 스코프 닫힘 여부 확인
- [Scope::isCancelled](/ko/docs/reference/scope/is-cancelled.html) — 스코프 취소 여부 확인
- [Scope::awaitCompletion](/ko/docs/reference/scope/await-completion.html) — 코루틴 완료 대기
