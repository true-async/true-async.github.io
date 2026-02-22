---
layout: docs
lang: ko
path_key: "/docs/reference/pool/try-acquire.html"
nav_active: docs
permalink: /ko/docs/reference/pool/try-acquire.html
page_title: "Pool::tryAcquire"
description: "풀에서 비차단으로 리소스를 획득합니다."
---

# Pool::tryAcquire

(PHP 8.6+, True Async 1.0)

```php
public Pool::tryAcquire(): mixed
```

차단 없이 풀에서 리소스 획득을 시도합니다. 사용 가능한 빈 리소스가
있거나 `max` 한도에 도달하지 않은 경우 리소스를 즉시 반환합니다.
그렇지 않으면 `null`을 반환합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

풀에서 리소스를 반환하거나, 사용 가능한 빈 리소스가 없고
최대 한도에 도달한 경우 `null`을 반환합니다.

## 예제

### 예제 #1 리소스 획득 시도

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    max: 5
);

$conn = $pool->tryAcquire();

if ($conn === null) {
    echo "All connections are busy, try again later\n";
} else {
    try {
        $result = $conn->query('SELECT COUNT(*) FROM orders');
        echo "Orders: " . $result->fetchColumn() . "\n";
    } finally {
        $pool->release($conn);
    }
}
```

### 예제 #2 풀을 사용할 수 없을 때 대체 동작

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new CacheClient('127.0.0.1', 11211),
    max: 3
);

function getData(Pool $pool, string $key): mixed
{
    $client = $pool->tryAcquire();

    if ($client === null) {
        // 캐시 사용 불가 — 데이터베이스에서 직접 조회
        return fetchFromDatabase($key);
    }

    try {
        return $client->get($key) ?? fetchFromDatabase($key);
    } finally {
        $pool->release($client);
    }
}
```

## 같이 보기

- [Pool::acquire](/ko/docs/reference/pool/acquire.html) --- 차단 리소스 획득
- [Pool::release](/ko/docs/reference/pool/release.html) --- 풀에 리소스 반환
