---
layout: docs
lang: ko
path_key: "/docs/reference/pool/count.html"
nav_active: docs
permalink: /ko/docs/reference/pool/count.html
page_title: "Pool::count"
description: "풀의 전체 리소스 수입니다."
---

# Pool::count

(PHP 8.6+, True Async 1.0)

```php
public Pool::count(): int
```

유휴 리소스와 활성(사용 중인) 리소스를 모두 포함한 풀의
전체 리소스 수를 반환합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

풀의 전체 리소스 수.

## 예제

### 예제 #1 풀 모니터링

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new PDO('mysql:host=localhost;dbname=app', 'user', 'pass'),
    min: 2,
    max: 10
);

echo "Total resources: " . $pool->count() . "\n";       // 2 (min)
echo "Idle: " . $pool->idleCount() . "\n";               // 2
echo "Active: " . $pool->activeCount() . "\n";           // 0

$conn1 = $pool->acquire();
$conn2 = $pool->acquire();
$conn3 = $pool->acquire(); // 새 리소스가 생성됨

echo "Total resources: " . $pool->count() . "\n";       // 3
echo "Idle: " . $pool->idleCount() . "\n";               // 0
echo "Active: " . $pool->activeCount() . "\n";           // 3
```

## 같이 보기

- [Pool::idleCount](/ko/docs/reference/pool/idle-count.html) --- 유휴 리소스 수
- [Pool::activeCount](/ko/docs/reference/pool/active-count.html) --- 활성 리소스 수
