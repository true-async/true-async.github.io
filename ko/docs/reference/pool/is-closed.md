---
layout: docs
lang: ko
path_key: "/docs/reference/pool/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/pool/is-closed.html
page_title: "Pool::isClosed"
description: "풀이 닫혔는지 확인합니다."
---

# Pool::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Pool::isClosed(): bool
```

`close()` 호출로 풀이 닫혔는지 확인합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

풀이 닫힌 경우 `true`, 활성인 경우 `false`를 반환합니다.

## 예제

### 예제 #1 풀 상태 확인

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

var_dump($pool->isClosed()); // bool(false)

$pool->close();

var_dump($pool->isClosed()); // bool(true)
```

### 예제 #2 조건부 풀 사용

```php
<?php

use Async\Pool;

function executeQuery(Pool $pool, string $sql): mixed
{
    if ($pool->isClosed()) {
        throw new \RuntimeException('Connection pool is closed');
    }

    $conn = $pool->acquire();

    try {
        return $conn->query($sql)->fetchAll();
    } finally {
        $pool->release($conn);
    }
}
```

## 같이 보기

- [Pool::close](/ko/docs/reference/pool/close.html) --- 풀 닫기
- [Pool::getState](/ko/docs/reference/pool/get-state.html) --- 서킷 브레이커 상태
