---
layout: docs
lang: ko
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /ko/docs/reference/context/set.html
page_title: "Context::set"
description: "키로 컨텍스트에 값을 설정합니다."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

지정된 키로 현재 컨텍스트에 값을 설정합니다. 기본적으로 키가
이미 존재하면 값이 **덮어쓰여지지 않습니다**. 강제로 덮어쓰려면
`replace = true` 매개변수를 사용하세요.

이 메서드는 `Context` 객체를 반환하여 메서드 체이닝을 허용합니다.

## 매개변수

**key**
: 값을 설정할 키. 문자열 또는 객체가 가능합니다.
  객체 키는 라이브러리 간 이름 충돌을 방지하는 데 유용합니다.

**value**
: 저장할 값. 모든 타입이 가능합니다.

**replace**
: `false` (기본값) --- 기존 값을 덮어쓰지 않음.
  `true` --- 키가 이미 존재하더라도 값을 덮어씀.

## 반환값

메서드 체이닝을 위한 `Context` 객체.

## 예제

### 예제 #1 문자열 키로 값 설정

```php
<?php

use function Async\current_context;

// Method chaining
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### 예제 #2 덮어쓰기 없는 동작

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Setting again without replace — value does NOT change
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// With replace = true — value is overwritten
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### 예제 #3 라이브러리 격리를 위한 객체 키

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Each library uses its own object key
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialized');
});
```

### 예제 #4 자식 코루틴에 컨텍스트 전달

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Parent context
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Child coroutines inherit values through find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Processing request: {$traceId}\n";

    // Child coroutine adds its own value
    current_context()->set('handler', 'user_controller');
});
```

## 같이 보기

- [Context::unset](/ko/docs/reference/context/unset.html) --- 키로 값 제거
- [Context::find](/ko/docs/reference/context/find.html) --- 키로 값 찾기
- [Context::get](/ko/docs/reference/context/get.html) --- 값 가져오기 (예외 발생)
- [current_context()](/ko/docs/reference/current-context.html) --- 현재 Scope 컨텍스트 가져오기
