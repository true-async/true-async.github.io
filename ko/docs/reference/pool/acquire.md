---
layout: docs
lang: ko
path_key: "/docs/reference/pool/acquire.html"
nav_active: docs
permalink: /ko/docs/reference/pool/acquire.html
page_title: "Pool::acquire"
description: "대기하며 풀에서 리소스를 획득합니다."
---

# Pool::acquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::acquire(int $timeout = 0): mixed
```

풀에서 리소스를 획득합니다. 사용 가능한 빈 리소스가 없고 최대 한도에
도달한 경우, 리소스가 사용 가능해질 때까지 코루틴이 차단됩니다.

풀에 빈 리소스가 있으면 즉시 반환됩니다. 빈 리소스가 없지만
`max` 한도에 도달하지 않은 경우 `factory`를 통해 새 리소스가 생성됩니다. 그렇지 않으면
리소스가 해제될 때까지 호출이 대기합니다.

## 매개변수

**timeout**
: 최대 대기 시간(밀리초).
  `0` --- 무한 대기.
  타임아웃이 초과되면 `PoolException`이 발생합니다.

## 반환값

풀에서 리소스를 반환합니다.

## 오류

다음 경우에 `Async\PoolException`을 발생시킵니다:
- 대기 타임아웃이 초과된 경우.
- 풀이 닫힌 경우.

## 예제

### 예제 #1 기본 사용

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

// 연결 획득 (필요시 대기)
$conn = $pool->acquire();

try {
    $stmt = $conn->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([42]);
    $user = $stmt->fetch();
} finally {
    $pool->release($conn);
}
```

### 예제 #2 타임아웃 사용

```php
<?php

use Async\Pool;
use Async\PoolException;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 2
);

try {
    $conn = $pool->acquire(timeout: 5000); // 최대 5초 대기
    // 연결로 작업...
    $pool->release($conn);
} catch (PoolException $e) {
    echo "Failed to acquire resource: {$e->getMessage()}\n";
}
```

## 같이 보기

- [Pool::tryAcquire](/ko/docs/reference/pool/try-acquire.html) --- 비차단 리소스 획득
- [Pool::release](/ko/docs/reference/pool/release.html) --- 풀에 리소스 반환
- [Pool::__construct](/ko/docs/reference/pool/construct.html) --- 풀 생성
