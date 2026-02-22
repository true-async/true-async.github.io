---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/on-finally.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/on-finally.html
page_title: "Coroutine::finally"
description: "코루틴이 완료될 때 호출될 핸들러를 등록합니다."
---

# Coroutine::finally

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::finally(\Closure $callback): void
```

코루틴이 완료될 때 결과에 관계없이(성공, 오류 또는 취소) 호출될 콜백 함수를 등록합니다.

`finally()` 호출 시점에 코루틴이 이미 완료된 경우, 콜백은 즉시 실행됩니다.

여러 핸들러를 등록할 수 있으며, 추가된 순서대로 실행됩니다.

## 매개변수

**callback**
: 핸들러 함수입니다. 코루틴 객체를 인수로 받습니다.

## 예제

### 예제 #1 기본 사용법

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

$coroutine->finally(function() {
    echo "Coroutine completed\n";
});

await($coroutine);
```

### 예제 #2 리소스 정리

```php
<?php

use function Async\spawn;
use function Async\await;

$connection = connectToDatabase();

$coroutine = spawn(function() use ($connection) {
    return $connection->query('SELECT * FROM users');
});

$coroutine->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$result = await($coroutine);
```

### 예제 #3 다중 핸들러

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "done");

$coroutine->finally(fn() => echo "Handler 1\n");
$coroutine->finally(fn() => echo "Handler 2\n");
$coroutine->finally(fn() => echo "Handler 3\n");

await($coroutine);
// Output:
// Handler 1
// Handler 2
// Handler 3
```

### 예제 #4 완료 후 등록

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => 42);
await($coroutine);

// 코루틴이 이미 완료됨 -- 콜백이 즉시 실행됨
$coroutine->finally(function() {
    echo "Called immediately\n";
});
```

## 같이 보기

- [Coroutine::isCompleted](/ko/docs/reference/coroutine/is-completed.html) -- 완료 확인
- [Coroutine::getResult](/ko/docs/reference/coroutine/get-result.html) -- 결과 가져오기
