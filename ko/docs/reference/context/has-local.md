---
layout: docs
lang: ko
path_key: "/docs/reference/context/has-local.html"
nav_active: docs
permalink: /ko/docs/reference/context/has-local.html
page_title: "Context::hasLocal"
description: "로컬 컨텍스트에서만 키가 존재하는지 확인합니다."
---

# Context::hasLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::hasLocal(string|object $key): bool
```

지정된 키를 가진 값이 현재 (로컬) 컨텍스트에**만** 존재하는지 확인합니다.
`has()`와 달리 이 메서드는 부모 컨텍스트를 검색하지 않습니다.

## 매개변수

**key**
: 확인할 키. 문자열 또는 객체가 가능합니다.

## 반환값

로컬 컨텍스트에서 키를 찾으면 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 has와 hasLocal의 차이

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('inherited_key', 'value');

spawn(function() {
    current_context()->set('local_key', 'value');

    // has() searches up the hierarchy
    var_dump(current_context()->has('inherited_key'));      // true
    var_dump(current_context()->has('local_key'));          // true

    // hasLocal() checks only the current level
    var_dump(current_context()->hasLocal('inherited_key')); // false
    var_dump(current_context()->hasLocal('local_key'));      // true
});
```

### 예제 #2 객체 키로 확인

```php
<?php

use function Async\current_context;
use function Async\spawn;

$configKey = new stdClass();
current_context()->set($configKey, ['debug' => true]);

spawn(function() use ($configKey) {
    $localKey = new stdClass();
    current_context()->set($localKey, 'local');

    var_dump(current_context()->hasLocal($configKey)); // false
    var_dump(current_context()->hasLocal($localKey));  // true
});
```

### 예제 #3 로컬 값의 조건부 초기화

```php
<?php

use function Async\current_context;
use function Async\spawn;

spawn(function() {
    // Initialize value only if not set locally
    if (!current_context()->hasLocal('request_count')) {
        current_context()->set('request_count', 0);
    }

    echo current_context()->getLocal('request_count') . "\n"; // 0
});
```

## 같이 보기

- [Context::has](/ko/docs/reference/context/has.html) --- 계층적 탐색으로 확인
- [Context::findLocal](/ko/docs/reference/context/find-local.html) --- 로컬 컨텍스트에서 값 찾기
- [Context::getLocal](/ko/docs/reference/context/get-local.html) --- 로컬 값 가져오기 (예외 발생)
