---
layout: docs
lang: ko
path_key: "/docs/reference/context/find-local.html"
nav_active: docs
permalink: /ko/docs/reference/context/find-local.html
page_title: "Context::findLocal"
description: "로컬 컨텍스트에서만 값을 찾습니다 (부모 컨텍스트 검색 없음)."
---

# Context::findLocal

(PHP 8.6+, True Async 1.0)

```php
public Context::findLocal(string|object $key): mixed
```

현재 (로컬) 컨텍스트에서**만** 키로 값을 검색합니다. `find()`와 달리
이 메서드는 부모 컨텍스트의 계층 구조를 따라 올라가며 검색하지 않습니다.

현재 수준에서 키를 찾지 못하면 `null`을 반환합니다.

## 매개변수

**key**
: 검색할 키. 문자열 또는 객체가 가능합니다.

## 반환값

로컬 컨텍스트에서 키와 연관된 값, 또는 키를 찾지 못한 경우 `null`.

## 예제

### 예제 #1 find와 findLocal의 차이

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('config', 'global_value');

spawn(function() {
    current_context()->set('local_data', 'local_value');

    // find() searches up the hierarchy
    echo current_context()->find('config') . "\n";       // "global_value"

    // findLocal() searches only at the current level
    echo current_context()->findLocal('local_data') . "\n"; // "local_value"
    var_dump(current_context()->findLocal('config'));        // NULL
});
```

### 예제 #2 객체 키 사용

```php
<?php

use function Async\current_context;
use function Async\spawn;

$parentKey = new stdClass();
$localKey = new stdClass();

current_context()->set($parentKey, 'parent_value');

spawn(function() use ($parentKey, $localKey) {
    current_context()->set($localKey, 'child_value');

    // Object key from parent is not visible through findLocal
    var_dump(current_context()->findLocal($parentKey)); // NULL
    var_dump(current_context()->findLocal($localKey));  // "child_value"
});
```

### 예제 #3 부모 값 오버라이딩

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('timeout', 5000);

spawn(function() {
    // Check if the value is overridden locally
    if (current_context()->findLocal('timeout') === null) {
        // Use inherited value, but can override
        current_context()->set('timeout', 3000);
    }

    echo current_context()->findLocal('timeout') . "\n"; // 3000
});
```

## 같이 보기

- [Context::find](/ko/docs/reference/context/find.html) --- 계층적 탐색 검색
- [Context::getLocal](/ko/docs/reference/context/get-local.html) --- 로컬 값 가져오기 (예외 발생)
- [Context::hasLocal](/ko/docs/reference/context/has-local.html) --- 로컬 컨텍스트에서 키 확인
