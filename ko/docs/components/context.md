---
layout: docs
lang: ko
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /ko/docs/components/context.html
page_title: "컨텍스트"
description: "TrueAsync의 컨텍스트 -- 스코프 계층에 데이터 저장, 로컬 및 상속 값, Go context.Context와 유사."
---

# Context: 실행 컨텍스트

## 왜 필요한가

인증 토큰에 연결된 작업을 수행해야 하는 서비스 클래스가 있는 `API`가 있습니다.
그러나 서비스의 모든 메서드에 토큰을 전달하는 것은 좋지 않은 방법입니다.
`PHP`에서는 이 문제를 전역 변수나 정적 클래스 속성으로 해결합니다.
하지만 단일 프로세스가 여러 요청을 처리할 수 있는 비동기 환경에서는 이 접근 방식이 작동하지 않습니다.
호출 시점에 어떤 요청이 처리되고 있는지 알 수 없기 때문입니다.

`Async\Context`를 사용하면 코루틴이나 `Scope`에 연결된 데이터를 저장하고
실행 컨텍스트를 기반으로 애플리케이션 로직을 구축할 수 있습니다.

## 컨텍스트란

`Async\Context`는 `Scope` 또는 코루틴에 바인딩된 키-값 저장소입니다.
컨텍스트는 계층을 형성합니다: 값을 읽을 때 스코프 트리를 위로 탐색합니다.

이는 `Go`의 `context.Context` 또는 `Kotlin`의 `CoroutineContext`와 유사합니다.
매개변수를 명시적으로 전달하지 않고 계층을 통해 데이터를 전달하는 메커니즘입니다.

## 세 가지 수준의 컨텍스트

`TrueAsync`는 컨텍스트에 접근하기 위한 세 가지 함수를 제공합니다:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// 현재 Scope의 컨텍스트
$scopeCtx = current_context();

// 현재 코루틴의 컨텍스트
$coroCtx = coroutine_context();

// 전역 루트 컨텍스트
$rootCtx = root_context();
?>
```

### current_context()

현재 `Scope`의 컨텍스트를 반환합니다. 컨텍스트가 아직 생성되지 않은 경우 자동으로 생성합니다.
여기에 설정된 값은 이 Scope의 모든 코루틴에서 볼 수 있습니다.

### coroutine_context()

현재 코루틴의 컨텍스트를 반환합니다. 이것은 이 코루틴만의 **비공개** 컨텍스트입니다.
다른 코루틴은 여기에 설정된 데이터를 볼 수 없습니다.

### root_context()

전체 요청에 걸쳐 공유되는 전역 컨텍스트를 반환합니다. 여기의 값은 모든 컨텍스트에서 `find()`를 통해 볼 수 있습니다.

## 키

키는 **문자열** 또는 **객체**가 될 수 있습니다:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// 문자열 키
$ctx->set('request_id', 'abc-123');

// 키로 객체 사용 (고유 토큰에 유용)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

객체 키는 컨텍스트에 참조로 저장되어 고유성을 보장합니다.

## 읽기: 로컬 및 계층적

### find() / get() / has() -- 계층적 검색

현재 컨텍스트에서 먼저 값을 검색한 다음, 부모에서, 그리고 루트까지 계속합니다:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find()는 계층을 위로 검색합니다
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- root_context에서 찾음
});
?>
```

### findLocal() / getLocal() / hasLocal() -- 현재 컨텍스트만

계층을 올라가지 않고 **현재** 컨텍스트에서만 값을 검색합니다:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- 이 값은 현재 Scope에 설정되지 않음

$inherited = current_context()->find('app_name');
// "MyApp" -- 상위 스코프에서 찾음
?>
```

## 쓰기 및 삭제

### set()

```php
<?php
$ctx = current_context();

// 값 설정 (기본 replace = false)
$ctx->set('key', 'value');

// replace 없이 반복 set -- 오류
$ctx->set('key', 'new_value'); // Error: A context key already exists

// 명시적 replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

`set()` 메서드는 `$this`를 반환하여 메서드 체이닝이 가능합니다:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

`unset()` 메서드도 `$this`를 반환합니다.

## 실용적인 예제

### 요청 ID 전달

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// 미들웨어가 request_id를 설정합니다
current_context()->set('request_id', bin2hex(random_bytes(8)));

// 이 스코프의 모든 코루틴이 읽을 수 있습니다
spawn(function() {
    $requestId = current_context()->find('request_id');
    // 로깅에 사용
    error_log("[$requestId] Processing request...");
});
?>
```

### 코루틴 컨텍스트를 비공개 저장소로 사용

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... 작업 수행
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // c1의 'step'을 볼 수 없음
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### root_context를 통한 설정

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// 요청 시작 시 설정
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// 모든 코루틴에서 사용 가능
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## 참고

- [Scope](/ko/docs/components/scope.html) -- 코루틴 수명 관리
- [코루틴](/ko/docs/components/coroutines.html) -- 동시성의 기본 단위
- [current_context()](/ko/docs/reference/current-context.html) -- 현재 Scope의 컨텍스트 가져오기
