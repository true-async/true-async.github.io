---
layout: docs
lang: ko
path_key: "/docs/reference/context/unset.html"
nav_active: docs
permalink: /ko/docs/reference/context/unset.html
page_title: "Context::unset"
description: "컨텍스트에서 키로 값을 제거합니다."
---

# Context::unset

(PHP 8.6+, True Async 1.0)

```php
public Context::unset(string|object $key): Context
```

현재 컨텍스트에서 키로 값을 제거합니다. 제거는 로컬 컨텍스트에만 영향을 미칩니다
--- 부모 컨텍스트의 값은 변경되지 않습니다.

이 메서드는 `Context` 객체를 반환하여 메서드 체이닝을 허용합니다.

## 매개변수

**key**
: 제거할 키. 문자열 또는 객체가 가능합니다.

## 반환값

메서드 체이닝을 위한 `Context` 객체.

## 예제

### 예제 #1 컨텍스트에서 값 제거

```php
<?php

use function Async\current_context;

current_context()
    ->set('temp_data', 'value')
    ->set('keep_data', 'preserve');

echo current_context()->find('temp_data') . "\n"; // "value"

// Remove temporary data
current_context()->unset('temp_data');

var_dump(current_context()->find('temp_data')); // NULL
echo current_context()->find('keep_data') . "\n"; // "preserve"
```

### 예제 #2 객체 키로 제거

```php
<?php

use function Async\current_context;

$tokenKey = new stdClass();

current_context()->set($tokenKey, 'secret-token-123');
echo current_context()->find($tokenKey) . "\n"; // "secret-token-123"

// Remove sensitive data after use
current_context()->unset($tokenKey);
var_dump(current_context()->find($tokenKey)); // NULL
```

### 예제 #3 제거가 부모 컨텍스트에 영향을 미치지 않음

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('shared', 'parent_value');

spawn(function() {
    // Child context sees value from parent
    echo current_context()->find('shared') . "\n"; // "parent_value"

    // Set a local value with the same key
    current_context()->set('shared', 'child_value', replace: true);
    echo current_context()->findLocal('shared') . "\n"; // "child_value"

    // Remove the local value
    current_context()->unset('shared');

    // After removing local value — parent value is visible again through find()
    echo current_context()->find('shared') . "\n"; // "parent_value"
    var_dump(current_context()->findLocal('shared')); // NULL
});
```

### 예제 #4 unset으로 메서드 체이닝

```php
<?php

use function Async\current_context;

current_context()
    ->set('a', 1)
    ->set('b', 2)
    ->set('c', 3);

// Clear multiple keys with chaining
current_context()
    ->unset('a')
    ->unset('b');

var_dump(current_context()->find('a')); // NULL
var_dump(current_context()->find('b')); // NULL
echo current_context()->find('c') . "\n"; // 3
```

## 같이 보기

- [Context::set](/ko/docs/reference/context/set.html) --- 컨텍스트에 값 설정
- [Context::find](/ko/docs/reference/context/find.html) --- 키로 값 찾기
- [Context::findLocal](/ko/docs/reference/context/find-local.html) --- 로컬 컨텍스트에서 값 찾기
