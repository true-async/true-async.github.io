---
layout: docs
lang: ko
path_key: "/docs/reference/pool/recover.html"
nav_active: docs
permalink: /ko/docs/reference/pool/recover.html
page_title: "Pool::recover"
description: "풀을 RECOVERING 상태로 전환합니다."
---

# Pool::recover

(PHP 8.6+, True Async 1.0)

```php
public Pool::recover(): void
```

풀을 `RECOVERING` 상태로 전환합니다. 이 상태에서 풀은
서비스 가용성을 확인하기 위해 제한된 수의 요청을 통과시킵니다.
요청이 성공하면 서킷 브레이커가 자동으로 풀을 `ACTIVE` 상태로
전환합니다. 요청이 계속 실패하면 풀은 `INACTIVE`로 되돌아갑니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 복구 시도

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// 풀이 비활성화됨, 복구 시도
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    $pool->recover();
    echo "Pool transitioned to recovery mode\n";
    // 서킷 브레이커가 탐색 요청을 통과시킴
}
```

### 예제 #2 주기적 복구 시도

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

spawn(function() use ($pool) {
    while (!$pool->isClosed()) {
        if ($pool->getState() === CircuitBreakerState::INACTIVE) {
            $pool->recover();
        }

        suspend(delay: 10000); // 10초마다 확인
    }
});
```

## 같이 보기

- [Pool::activate](/ko/docs/reference/pool/activate.html) --- 강제 활성화
- [Pool::deactivate](/ko/docs/reference/pool/deactivate.html) --- 강제 비활성화
- [Pool::getState](/ko/docs/reference/pool/get-state.html) --- 현재 상태
- [Pool::setCircuitBreakerStrategy](/ko/docs/reference/pool/set-circuit-breaker-strategy.html) --- 전략 구성
