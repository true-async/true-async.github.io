---
layout: docs
lang: ko
path_key: "/docs/reference/pool/close.html"
nav_active: docs
permalink: /ko/docs/reference/pool/close.html
page_title: "Pool::close"
description: "풀을 닫고 모든 리소스를 파괴합니다."
---

# Pool::close

(PHP 8.6+, True Async 1.0)

```php
public Pool::close(): void
```

리소스 풀을 닫습니다. 모든 유휴 리소스는 `destructor`를 통해 파괴됩니다
(제공된 경우). `acquire()`를 통해 리소스를 대기하는 모든 코루틴은
`PoolException`을 수신합니다. 닫힌 후 `acquire()` 및 `tryAcquire()` 호출은
예외를 발생시킵니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 정상 종료

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    destructor: function(PDO $pdo): void {
        // Close all prepared statements and connection
    },
    min: 2,
    max: 10
);

// ... 풀 작업 ...

// 애플리케이션 종료 시 풀 닫기
$pool->close();
```

### 예제 #2 대기 중인 코루틴이 예외를 수신

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 1
);

$resource = $pool->acquire(); // 유일한 리소스를 가져감

spawn(function() use ($pool) {
    try {
        $pool->acquire(); // 해제를 대기
    } catch (PoolException $e) {
        echo "Pool closed: {$e->getMessage()}\n";
    }
});

$pool->close(); // 대기 중인 코루틴이 PoolException을 수신
```

## 같이 보기

- [Pool::isClosed](/ko/docs/reference/pool/is-closed.html) --- 풀이 닫혔는지 확인
- [Pool::__construct](/ko/docs/reference/pool/construct.html) --- 풀 생성
