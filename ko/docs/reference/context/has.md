---
layout: docs
lang: ko
path_key: "/docs/reference/context/has.html"
nav_active: docs
permalink: /ko/docs/reference/context/has.html
page_title: "Context::has"
description: "현재 또는 부모 컨텍스트에 키가 존재하는지 확인합니다."
---

# Context::has

(PHP 8.6+, True Async 1.0)

```php
public Context::has(string|object $key): bool
```

지정된 키를 가진 값이 현재 컨텍스트 또는 부모 컨텍스트 중 하나에
존재하는지 확인합니다. 계층 구조를 따라 올라가며 검색이 수행됩니다.

## 매개변수

**key**
: 확인할 키. 문자열 또는 객체가 가능합니다.

## 반환값

현재 또는 부모 컨텍스트에서 키를 찾으면 `true`, 그렇지 않으면 `false`.

## 예제

### 예제 #1 사용 전 키 확인

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('locale', 'ru_RU');

spawn(function() {
    if (current_context()->has('locale')) {
        $locale = current_context()->find('locale');
        echo "Locale: {$locale}\n"; // "Locale: ru_RU"
    } else {
        echo "Locale not set, using default\n";
    }
});
```

### 예제 #2 객체 키로 확인

```php
<?php

use function Async\current_context;

$cacheKey = new stdClass();

current_context()->set($cacheKey, new RedisCache());

if (current_context()->has($cacheKey)) {
    echo "Cache is available\n";
}

$unknownKey = new stdClass();
var_dump(current_context()->has($unknownKey)); // false
```

### 예제 #3 계층적 확인

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('global_flag', true);

spawn(function() {
    current_context()->set('local_flag', true);

    spawn(function() {
        var_dump(current_context()->has('global_flag')); // true (from root)
        var_dump(current_context()->has('local_flag'));   // true (from parent)
        var_dump(current_context()->has('unknown'));      // false
    });
});
```

## 같이 보기

- [Context::find](/ko/docs/reference/context/find.html) --- 키로 값 찾기
- [Context::get](/ko/docs/reference/context/get.html) --- 값 가져오기 (예외 발생)
- [Context::hasLocal](/ko/docs/reference/context/has-local.html) --- 로컬 컨텍스트에서만 확인
