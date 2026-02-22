---
layout: docs
lang: ko
path_key: "/docs/reference/pool/idle-count.html"
nav_active: docs
permalink: /ko/docs/reference/pool/idle-count.html
page_title: "Pool::idleCount"
description: "풀에서 유휴 리소스의 수입니다."
---

# Pool::idleCount

(PHP 8.6+, True Async 1.0)

```php
public Pool::idleCount(): int
```

획득 준비가 된 유휴(미사용) 리소스의 수를 반환합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

풀의 유휴 리소스 수.

## 예제

### 예제 #1 유휴 리소스 추적

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 3,
    max: 10
);

echo $pool->idleCount() . "\n"; // 3

$conn = $pool->acquire();
echo $pool->idleCount() . "\n"; // 2

$pool->release($conn);
echo $pool->idleCount() . "\n"; // 3
```

### 예제 #2 적응형 전략

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => createExpensiveResource(),
    min: 1,
    max: 20
);

// 유휴 리소스가 적으면 — 부하 감소
if ($pool->idleCount() < 2 && $pool->count() >= 18) {
    echo "Warning: pool is nearly exhausted\n";
}
```

## 같이 보기

- [Pool::activeCount](/ko/docs/reference/pool/active-count.html) --- 활성 리소스 수
- [Pool::count](/ko/docs/reference/pool/count.html) --- 전체 리소스 수
