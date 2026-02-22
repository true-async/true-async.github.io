---
layout: docs
lang: ko
path_key: "/docs/reference/scope/as-not-safely.html"
nav_active: docs
permalink: /ko/docs/reference/scope/as-not-safely.html
page_title: "Scope::asNotSafely"
description: "스코프를 안전하지 않은 것으로 표시합니다 — 코루틴은 좀비가 되는 대신 취소 신호를 받습니다."
---

# Scope::asNotSafely

(PHP 8.6+, True Async 1.0)

```php
public function asNotSafely(): Scope
```

스코프를 "안전하지 않음"으로 표시합니다. 이러한 스코프에서 `disposeSafely()`를 호출하면 코루틴은 좀비가 **되지 않고** 대신 취소 신호를 받습니다. 이는 완료 보장이 필요하지 않은 백그라운드 작업에 유용합니다.

이 메서드는 동일한 스코프 객체를 반환하여 메서드 체이닝(플루언트 인터페이스)을 가능하게 합니다.

## 반환값

`Scope` — 동일한 스코프 객체 (메서드 체이닝용).

## 예제

### 예제 #1 백그라운드 작업용 스코프

```php
<?php

use Async\Scope;

$scope = (new Scope())->asNotSafely();

$scope->spawn(function() {
    while (true) {
        // 백그라운드 작업: 캐시 정리
        cleanExpiredCache();
        \Async\delay(60_000);
    }
});

// disposeSafely()를 사용하면 코루틴은 좀비가 되는 대신 취소됩니다
$scope->disposeSafely();
```

### 예제 #2 inherit와 함께 사용

```php
<?php

use Async\Scope;

$parentScope = new Scope();
$bgScope = Scope::inherit($parentScope)->asNotSafely();

$bgScope->spawn(function() {
    echo "Background process\n";
    \Async\delay(10_000);
});

// 종료 시: 코루틴은 좀비가 아닌 취소됩니다
$bgScope->disposeSafely();
```

## 참고

- [Scope::disposeSafely](/ko/docs/reference/scope/dispose-safely.html) — 스코프를 안전하게 닫기
- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프를 강제로 닫기
- [Scope::cancel](/ko/docs/reference/scope/cancel.html) — 모든 코루틴 취소
