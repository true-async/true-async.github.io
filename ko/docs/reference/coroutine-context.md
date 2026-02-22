---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — 현재 코루틴의 프라이빗 컨텍스트를 가져옵니다."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — 현재 코루틴에 바인딩된 `Async\Context` 객체를 반환합니다.

## 설명

```php
coroutine_context(): Async\Context
```

현재 코루틴의 **프라이빗** 컨텍스트를 반환합니다. 여기에 설정된 데이터는 다른 코루틴에서 볼 수 없습니다. 코루틴의 컨텍스트가 아직 생성되지 않은 경우 자동으로 생성됩니다.

## 반환 값

`Async\Context` 객체입니다.

## 예제

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // 동일한 코루틴에서 나중에
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // 다른 코루틴에서는 'step'을 볼 수 없습니다
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## 같이 보기

- [current_context()](/ko/docs/reference/current-context.html) — Scope 컨텍스트
- [root_context()](/ko/docs/reference/root-context.html) — 전역 컨텍스트
- [Context](/ko/docs/components/context.html) — 컨텍스트 개념
