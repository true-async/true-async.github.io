---
layout: docs
lang: ko
path_key: "/docs/reference/context/get-local.html"
nav_active: docs
permalink: /ko/docs/reference/context/get-local.html
page_title: "Context::getLocal"
description: "로컬 컨텍스트에서만 값을 가져옵니다. 찾지 못하면 예외를 발생시킵니다."
---

# Context::getLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::getLocal(string|object $key): mixed
```

현재 (로컬) 컨텍스트에서**만** 키로 값을 가져옵니다.
`get()`과 달리 이 메서드는 부모 컨텍스트를 검색하지 않습니다.

현재 수준에서 키를 찾지 못하면 예외를 발생시킵니다.

## 매개변수

**key**
: 검색할 키. 문자열 또는 객체가 가능합니다.

## 반환값

로컬 컨텍스트에서 키와 연관된 값.

## 오류

- 로컬 컨텍스트에서 키를 찾지 못하면 `Async\ContextException`을 발생시킵니다.

## 예제

### 예제 #1 로컬 값 가져오기

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    current_context()->set('task_id', 42);

    // Value is set locally — getLocal works
    $taskId = current_context()->getLocal('task_id');
    echo "Task: {$taskId}\n"; // "Task: 42"
});
```

### 예제 #2 상속된 키 접근 시 예외

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('parent_value', 'hello');

spawn(function() {
    // find() would find the value in the parent
    echo current_context()->find('parent_value') . "\n"; // "hello"

    // getLocal() throws an exception — value is not in the local context
    try {
        current_context()->getLocal('parent_value');
    } catch (\Async\ContextException $e) {
        echo "Not found locally: " . $e->getMessage() . "\n";
    }
});
```

### 예제 #3 객체 키 사용

```php
<?php

use function Async\current_context;
use function Async\spawn;

class SessionKey {}

spawn(function() {
    $key = new SessionKey();
    current_context()->set($key, ['user' => 'admin', 'role' => 'superuser']);

    $session = current_context()->getLocal($key);
    echo "User: " . $session['user'] . "\n"; // "User: admin"
});
```

## 같이 보기

- [Context::get](/ko/docs/reference/context/get.html) --- 계층적 검색으로 값 가져오기
- [Context::findLocal](/ko/docs/reference/context/find-local.html) --- 로컬 컨텍스트에서 안전한 검색
- [Context::hasLocal](/ko/docs/reference/context/has-local.html) --- 로컬 컨텍스트에서 키 확인
