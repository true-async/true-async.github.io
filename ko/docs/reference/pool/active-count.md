---
layout: docs
lang: ko
path_key: "/docs/reference/pool/active-count.html"
nav_active: docs
permalink: /ko/docs/reference/pool/active-count.html
page_title: "Pool::activeCount"
description: "풀에서 활성 리소스의 수입니다."
---

# Pool::activeCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::activeCount(): int
```

현재 사용 중인 리소스의 수를 반환합니다
(`acquire()` 또는 `tryAcquire()`로 획득되었고 아직 `release()`를 통해
반환되지 않은 리소스).

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

활성 리소스의 수.

## 예제

### 예제 #1 활성 리소스 수 확인

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new \stdClass(),
    max: 5
);

echo $pool->activeCount() . "\n"; // 0

$r1 = $pool->acquire();
$r2 = $pool->acquire();
echo $pool->activeCount() . "\n"; // 2

$pool->release($r1);
echo $pool->activeCount() . "\n"; // 1
```

### 예제 #2 풀 통계 표시

```php
<?php

use Async\Pool;

function poolStats(Pool $pool): string
{
    return sprintf(
        "Pool: total=%d, active=%d, idle=%d",
        $pool->count(),
        $pool->activeCount(),
        $pool->idleCount()
    );
}
```

## 같이 보기

- [Pool::idleCount](/ko/docs/reference/pool/idle-count.html) --- 유휴 리소스 수
- [Pool::count](/ko/docs/reference/pool/count.html) --- 전체 리소스 수
