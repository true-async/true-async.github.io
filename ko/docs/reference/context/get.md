---
layout: docs
lang: ko
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /ko/docs/reference/context/get.html
page_title: "Context::get"
description: "컨텍스트에서 값을 가져옵니다. 키를 찾지 못하면 예외를 발생시킵니다."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

현재 컨텍스트에서 키로 값을 가져옵니다. 현재 수준에서 키를 찾지 못하면
부모 컨텍스트의 계층 구조를 따라 올라가며 검색을 계속합니다.

`find()`와 달리 이 메서드는 어떤 수준에서도 키를 찾지 못하면 예외를 발생시킵니다.
값의 존재가 필수 요건인 경우 `get()`을 사용하세요.

## 매개변수

**key**
: 검색할 키. 문자열 또는 객체가 가능합니다.
  객체를 키로 사용하면 객체 참조로 검색이 수행됩니다.

## 반환값

키와 연관된 값.

## 오류

- 현재 컨텍스트나 부모 컨텍스트에서 키를 찾지 못하면 `Async\ContextException`을 발생시킵니다.

## 예제

### 예제 #1 필수 값 가져오기

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Get a value that must exist
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### 예제 #2 누락된 키 처리

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Key not found: " . $e->getMessage() . "\n";
}
```

### 예제 #3 객체 키 사용

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // Object key ensures uniqueness without name conflicts
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## 같이 보기

- [Context::find](/ko/docs/reference/context/find.html) --- 안전한 검색 (null 반환)
- [Context::has](/ko/docs/reference/context/has.html) --- 키 존재 여부 확인
- [Context::getLocal](/ko/docs/reference/context/get-local.html) --- 로컬 컨텍스트에서만 값 가져오기
- [Context::set](/ko/docs/reference/context/set.html) --- 컨텍스트에 값 설정
