---
layout: docs
lang: ko
path_key: "/docs/reference/context/find.html"
nav_active: docs
permalink: /ko/docs/reference/context/find.html
page_title: "Context::find"
description: "현재 또는 부모 컨텍스트에서 키로 값을 찾습니다."
---

# Context::find

(PHP 8.6+, True Async 1.0)

```php
public Context::find(string|object $key): mixed
```

현재 컨텍스트에서 키로 값을 검색합니다. 키를 찾지 못하면 부모 컨텍스트의
계층 구조를 따라 올라가며 검색을 계속합니다. 어떤 수준에서도 값을 찾지 못하면 `null`을 반환합니다.

이 메서드는 안전한 검색 방법입니다: 키가 없을 때 예외를 발생시키지 않습니다.

## 매개변수

**key**
: 검색할 키. 문자열 또는 객체가 가능합니다.
  객체를 키로 사용하면 객체 참조로 검색이 수행됩니다.

## 반환값

키와 연관된 값, 또는 현재 컨텍스트나 부모 컨텍스트에서 키를 찾지 못한 경우 `null`.

## 예제

### 예제 #1 문자열 키로 값 검색

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Child coroutine finds value from parent context
    $id = current_context()->find('request_id');
    echo $id . "\n"; // "abc-123"

    // Searching for a non-existent key returns null
    $missing = current_context()->find('nonexistent');
    var_dump($missing); // NULL
});
```

### 예제 #2 객체 키로 값 검색

```php
<?php

use function Async\current_context;
use function Async\spawn;

$loggerKey = new stdClass();

current_context()->set($loggerKey, new MyLogger());

spawn(function() use ($loggerKey) {
    // Search by object key reference
    $logger = current_context()->find($loggerKey);
    $logger->info('Message from child coroutine');
});
```

### 예제 #3 계층적 검색

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Root level
current_context()->set('app_name', 'MyApp');

spawn(function() {
    // Level 1: add own value
    current_context()->set('user_id', 42);

    spawn(function() {
        // Level 2: search for values from all levels
        echo current_context()->find('user_id') . "\n";   // 42
        echo current_context()->find('app_name') . "\n";  // "MyApp"
    });
});
```

## 같이 보기

- [Context::get](/ko/docs/reference/context/get.html) --- 값 가져오기 (없으면 예외 발생)
- [Context::has](/ko/docs/reference/context/has.html) --- 키 존재 여부 확인
- [Context::findLocal](/ko/docs/reference/context/find-local.html) --- 로컬 컨텍스트에서만 검색
- [Context::set](/ko/docs/reference/context/set.html) --- 컨텍스트에 값 설정
