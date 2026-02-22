---
layout: docs
lang: ko
path_key: "/docs/reference/pool/get-state.html"
nav_active: docs
permalink: /ko/docs/reference/pool/get-state.html
page_title: "Pool::getState"
description: "현재 서킷 브레이커 상태를 가져옵니다."
---

# Pool::getState

(PHP 8.6+, True Async 1.0)

```php
public Pool::getState(): CircuitBreakerState
```

풀의 현재 서킷 브레이커 상태를 반환합니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

`CircuitBreakerState` 열거형 값:

- `CircuitBreakerState::ACTIVE` --- 풀이 정상적으로 작동 중이며 리소스가 배포되고 있습니다.
- `CircuitBreakerState::INACTIVE` --- 풀이 비활성화되었으며 요청이 거부됩니다.
- `CircuitBreakerState::RECOVERING` --- 풀이 복구 모드에 있으며, 서비스 가용성을 확인하기 위해
  제한된 수의 요청을 허용합니다.

## 예제

### 예제 #1 풀 상태 확인

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

$state = $pool->getState();

match ($state) {
    CircuitBreakerState::ACTIVE => echo "Pool is active\n",
    CircuitBreakerState::INACTIVE => echo "Service unavailable\n",
    CircuitBreakerState::RECOVERING => echo "Recovering...\n",
};
```

### 예제 #2 상태에 기반한 조건부 로직

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

function makeRequest(Pool $pool, string $endpoint): mixed
{
    if ($pool->getState() === CircuitBreakerState::INACTIVE) {
        // 서비스 호출 대신 캐시된 데이터 사용
        return getCachedResponse($endpoint);
    }

    $client = $pool->acquire(timeout: 3000);

    try {
        return $client->get($endpoint);
    } finally {
        $pool->release($client);
    }
}
```

## 같이 보기

- [Pool::setCircuitBreakerStrategy](/ko/docs/reference/pool/set-circuit-breaker-strategy.html) --- 전략 설정
- [Pool::activate](/ko/docs/reference/pool/activate.html) --- 강제 활성화
- [Pool::deactivate](/ko/docs/reference/pool/deactivate.html) --- 강제 비활성화
- [Pool::recover](/ko/docs/reference/pool/recover.html) --- 복구 모드로 전환
