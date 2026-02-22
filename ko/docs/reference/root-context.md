---
layout: docs
lang: ko
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /ko/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — 모든 스코프에서 접근 가능한 전역 루트 컨텍스트를 가져옵니다."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — 전체 요청에서 공유되는 전역 루트 `Async\Context` 객체를 반환합니다.

## 설명

```php
root_context(): Async\Context
```

최상위 컨텍스트를 반환합니다. 여기에 설정된 값은 계층 구조의 모든 컨텍스트에서 `find()`를 통해 접근할 수 있습니다.

## 반환 값

`Async\Context` 객체입니다.

## 예제

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// 전역 설정 지정
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // find()를 통해 모든 코루틴에서 접근 가능
    $env = current_context()->find('environment'); // "production"
});
?>
```

## 같이 보기

- [current_context()](/ko/docs/reference/current-context.html) — Scope 컨텍스트
- [coroutine_context()](/ko/docs/reference/coroutine-context.html) — 코루틴 컨텍스트
- [Context](/ko/docs/components/context.html) — 컨텍스트 개념
