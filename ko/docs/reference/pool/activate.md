---
layout: docs
lang: ko
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /ko/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "풀을 ACTIVE 상태로 강제 전환합니다."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

풀을 강제로 `ACTIVE` 상태로 전환합니다. 리소스를 다시 획득할 수
있게 됩니다. 수동 서킷 브레이커 관리에 사용되며, 예를 들어
서비스가 복구되었음을 확인한 후에 사용합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 확인 후 수동 활성화

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// 풀이 비활성화되었다고 가정
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // 서비스 가용성 수동 확인
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### 예제 #2 외부 신호에 의한 활성화

```php
<?php

use Async\Pool;

// 모니터링 시스템의 웹훅 핸들러
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## 같이 보기

- [Pool::deactivate](/ko/docs/reference/pool/deactivate.html) --- INACTIVE 상태로 전환
- [Pool::recover](/ko/docs/reference/pool/recover.html) --- RECOVERING 상태로 전환
- [Pool::getState](/ko/docs/reference/pool/get-state.html) --- 현재 상태
