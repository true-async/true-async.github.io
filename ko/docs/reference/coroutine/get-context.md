---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "코루틴의 로컬 컨텍스트를 가져옵니다."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

코루틴의 로컬 컨텍스트를 반환합니다. 컨텍스트는 처음 접근할 때 지연 생성됩니다.

컨텍스트를 사용하면 특정 코루틴에 바인딩된 데이터를 저장하고 자식 코루틴에 전달할 수 있습니다.

## 반환값

`Async\Context` -- 코루틴의 컨텍스트 객체입니다.

## 예제

### 예제 #1 컨텍스트 접근

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## 같이 보기

- [Context](/ko/docs/components/context.html) -- 컨텍스트 개념
- [current_context()](/ko/docs/reference/current-context.html) -- 현재 코루틴의 컨텍스트 가져오기
