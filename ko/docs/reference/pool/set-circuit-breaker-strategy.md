---
layout: docs
lang: ko
path_key: "/docs/reference/pool/set-circuit-breaker-strategy.html"
nav_active: docs
permalink: /ko/docs/reference/pool/set-circuit-breaker-strategy.html
page_title: "Pool::setCircuitBreakerStrategy"
description: "풀의 서킷 브레이커 전략을 설정합니다."
---

# Pool::setCircuitBreakerStrategy

(PHP 8.6+, True Async 1.0)

```php
public Pool::setCircuitBreakerStrategy(?CircuitBreakerStrategy $strategy): void
```

풀의 서킷 브레이커 전략을 설정합니다. 서킷 브레이커는
외부 서비스의 가용성을 모니터링합니다: 여러 번의 실패를 감지하면 풀이
자동으로 `INACTIVE` 상태로 전환되어 오류의 연쇄를 방지합니다.
서비스가 복구되면 풀은 활성 상태로 돌아갑니다.

## 매개변수

**strategy**
: 상태 간 전환 규칙을 정의하는 `CircuitBreakerStrategy` 객체.
  `null` --- 서킷 브레이커 비활성화.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 전략 설정

```php
<?php

use Async\Pool;
use Async\CircuitBreakerStrategy;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    destructor: fn(HttpClient $c) => $c->close(),
    max: 10
);

$strategy = new CircuitBreakerStrategy(
    failureThreshold: 5,       // 5번 오류 후 — 비활성화
    recoveryTimeout: 30000,    // 30초 후 — 복구 시도
    successThreshold: 3        // 3번 성공 요청 — 완전 활성화
);

$pool->setCircuitBreakerStrategy($strategy);
```

### 예제 #2 서킷 브레이커 비활성화

```php
<?php

use Async\Pool;

// 전략 비활성화
$pool->setCircuitBreakerStrategy(null);
```

## 같이 보기

- [Pool::getState](/ko/docs/reference/pool/get-state.html) --- 현재 서킷 브레이커 상태
- [Pool::activate](/ko/docs/reference/pool/activate.html) --- 강제 활성화
- [Pool::deactivate](/ko/docs/reference/pool/deactivate.html) --- 강제 비활성화
- [Pool::recover](/ko/docs/reference/pool/recover.html) --- 복구 모드로 전환
