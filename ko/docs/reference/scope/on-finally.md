---
layout: docs
lang: ko
path_key: "/docs/reference/scope/on-finally.html"
nav_active: docs
permalink: /ko/docs/reference/scope/on-finally.html
page_title: "Scope::finally"
description: "스코프가 완료될 때 호출될 콜백을 등록합니다."
---

# Scope::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(\Closure $callback): void
```

스코프가 완료될 때 실행될 콜백 함수를 등록합니다. 이는 스코프를 위한 `finally` 블록에 해당하며, 스코프가 어떻게 종료되었든(정상적으로, 취소로, 또는 오류로) 정리 코드의 실행을 보장합니다.

## 매개변수

`callback` — 스코프가 완료될 때 호출될 클로저.

## 반환값

반환값이 없습니다.

## 예제

### 예제 #1 리소스 정리

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Scope completed, cleaning up resources\n";
    // 연결 닫기, 임시 파일 삭제
});

$scope->spawn(function() {
    echo "Executing task\n";
});

$scope->awaitCompletion();
// 출력: "Executing task"
// 출력: "Scope completed, cleaning up resources"
```

### 예제 #2 여러 콜백

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->finally(function() {
    echo "Closing database connection\n";
});

$scope->finally(function() {
    echo "Writing metrics\n";
});

$scope->spawn(function() {
    \Async\delay(1000);
});

$scope->dispose();
// 스코프가 완료되면 두 콜백 모두 호출됩니다
```

## 참고

- [Scope::dispose](/ko/docs/reference/scope/dispose.html) — 스코프 닫기
- [Scope::isFinished](/ko/docs/reference/scope/is-finished.html) — 스코프 완료 여부 확인
- [Coroutine::finally](/ko/docs/reference/coroutine/on-finally.html) — 코루틴 완료 시 콜백
