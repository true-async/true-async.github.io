---
layout: docs
lang: ko
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /ko/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — 현재 Scope의 컨텍스트를 가져옵니다."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — 현재 Scope에 바인딩된 `Async\Context` 객체를 반환합니다.

## 설명

```php
current_context(): Async\Context
```

현재 Scope의 컨텍스트가 아직 생성되지 않은 경우 자동으로 생성됩니다.
이 컨텍스트에 설정된 값은 `find()`를 통해 현재 Scope의 모든 코루틴에서 볼 수 있습니다.

## 반환 값

`Async\Context` 객체입니다.

## 예제

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // 부모 스코프의 값을 볼 수 있습니다
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## 같이 보기

- [coroutine_context()](/ko/docs/reference/coroutine-context.html) — 코루틴 컨텍스트
- [root_context()](/ko/docs/reference/root-context.html) — 전역 컨텍스트
- [Context](/ko/docs/components/context.html) — 컨텍스트 개념
