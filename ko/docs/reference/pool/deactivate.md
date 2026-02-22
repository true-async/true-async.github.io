---
layout: docs
lang: ko
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /ko/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "풀을 INACTIVE 상태로 강제 전환합니다."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

풀을 강제로 `INACTIVE` 상태로 전환합니다. 이 상태에서
풀은 모든 리소스 획득 요청을 거부합니다. 외부 서비스에
문제가 감지될 때 수동 비활성화에 사용됩니다.

`close()`와 달리, 비활성화는 되돌릴 수 있습니다 --- `activate()` 또는 `recover()`를 통해
풀을 작동 상태로 되돌릴 수 있습니다.

## 매개변수

이 메서드는 매개변수를 받지 않습니다.

## 반환값

값을 반환하지 않습니다.

## 예제

### 예제 #1 문제 감지 시 비활성화

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// 치명적 오류 감지 시
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### 예제 #2 계획된 유지보수

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## 같이 보기

- [Pool::activate](/ko/docs/reference/pool/activate.html) --- ACTIVE 상태로 전환
- [Pool::recover](/ko/docs/reference/pool/recover.html) --- RECOVERING 상태로 전환
- [Pool::getState](/ko/docs/reference/pool/get-state.html) --- 현재 상태
- [Pool::close](/ko/docs/reference/pool/close.html) --- 영구 풀 닫기(되돌릴 수 없음)
