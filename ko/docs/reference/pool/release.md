---
layout: docs
lang: ko
path_key: "/docs/reference/pool/release.html"
nav_active: docs
permalink: /ko/docs/reference/pool/release.html
page_title: "Pool::release"
description: "풀에 리소스를 반환합니다."
---

# Pool::release

(PHP 8.6+, True Async 1.0)

```php
public Pool::release(mixed $resource): void
```

이전에 획득한 리소스를 풀에 반환합니다. 풀 생성 시 `beforeRelease` 훅이
설정된 경우, 반환 전에 호출됩니다. 훅이 `false`를 반환하면
리소스가 풀에 반환되는 대신 파괴됩니다.

`acquire()`를 통해 리소스를 대기하는 코루틴이 있으면 리소스가
첫 번째 대기 중인 코루틴에 즉시 전달됩니다.

## 매개변수

**resource**
: `acquire()` 또는 `tryAcquire()`를 통해 이전에 획득한 리소스.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 finally를 통한 안전한 반환

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 10
);

$conn = $pool->acquire();

try {
    $conn->beginTransaction();
    $conn->exec("INSERT INTO logs (message) VALUES ('event')");
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
    throw $e;
} finally {
    $pool->release($conn);
}
```

### 예제 #2 beforeRelease를 통한 자동 파괴

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new TcpClient('api.example.com', 443),
    destructor: fn(TcpClient $c) => $c->disconnect(),
    beforeRelease: function(TcpClient $client): bool {
        // 연결이 끊어진 경우 — 풀에 반환하지 않음
        return $client->isAlive();
    },
    max: 5
);

$client = $pool->acquire();

try {
    $client->send('PING');
} finally {
    // isAlive()가 false를 반환하면 클라이언트가 파괴됨
    $pool->release($client);
}
```

## 같이 보기

- [Pool::acquire](/ko/docs/reference/pool/acquire.html) --- 풀에서 리소스 획득
- [Pool::tryAcquire](/ko/docs/reference/pool/try-acquire.html) --- 비차단 획득
- [Pool::close](/ko/docs/reference/pool/close.html) --- 풀 닫기
