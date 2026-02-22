---
layout: docs
lang: ko
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /ko/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- 코루틴을 위한 범용 리소스 풀: 생성, acquire/release, healthcheck, 서킷 브레이커."
---

# Async\Pool: 범용 리소스 풀

## 풀이 필요한 이유

코루틴으로 작업할 때 I/O 디스크립터 공유 문제가 발생합니다.
두 코루틴이 같은 소켓을 동시에 사용하여 서로 다른 패킷을 쓰거나 읽으면,
데이터가 섞이고 결과를 예측할 수 없게 됩니다.
따라서 동일한 `PDO` 객체를 다른 코루틴에서 단순히 사용할 수 없습니다!

반면, 각 코루틴마다 별도의 연결을 반복해서 생성하는 것은 매우 낭비적인 전략입니다.
이는 동시 I/O의 장점을 상쇄합니다. 따라서 외부 API, 데이터베이스 및
기타 리소스와 상호 작용하기 위해 일반적으로 연결 풀이 사용됩니다.

풀이 이 문제를 해결합니다: 리소스가 미리 생성되고, 요청 시 코루틴에 제공되며,
재사용을 위해 반환됩니다.

```php
use Async\Pool;

// HTTP 연결 풀
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// 코루틴이 연결을 가져와 사용하고 반환
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## 풀 생성

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // 리소스 생성 방법
    destructor:         fn($r) => $r->close(),          // 리소스 파괴 방법
    healthcheck:        fn($r) => $r->ping(),           // 리소스가 살아있는지?
    beforeAcquire:      fn($r) => $r->isValid(),        // 제공 전 확인
    beforeRelease:      fn($r) => !$r->isBroken(),      // 반환 전 확인
    min:                2,                               // 2개 미리 생성
    max:                10,                              // 최대 10개 리소스
    healthcheckInterval: 30000,                          // 30초마다 확인
);
```

| 매개변수               | 용도                                                           | 기본값  |
|------------------------|----------------------------------------------------------------|---------|
| `factory`              | 새 리소스를 생성합니다. **필수**                                  | --      |
| `destructor`           | 풀에서 제거될 때 리소스를 파괴합니다                               | `null`  |
| `healthcheck`          | 주기적 확인: 리소스가 아직 살아있는지?                             | `null`  |
| `beforeAcquire`        | 제공 전 확인. `false` -- 파괴하고 다음 것을 가져옴                 | `null`  |
| `beforeRelease`        | 반환 전 확인. `false` -- 파괴, 반환하지 않음                      | `null`  |
| `min`                  | 미리 생성할 리소스 수 (프리워밍)                                  | `0`     |
| `max`                  | 최대 리소스 수 (유휴 + 사용 중)                                  | `10`    |
| `healthcheckInterval`  | 백그라운드 상태 확인 간격 (ms, 0 = 비활성화)                      | `0`     |

## 획득과 반환

### 블로킹 Acquire

```php
// 리소스가 사용 가능해질 때까지 대기 (무한)
$resource = $pool->acquire();

// 최대 5초 대기
$resource = $pool->acquire(timeout: 5000);
```

풀이 가득 찬 경우 (모든 리소스가 사용 중이고 `max`에 도달), 코루틴은 **일시 중단**되고
다른 코루틴이 리소스를 반환할 때까지 기다립니다. 다른 코루틴은 계속 실행됩니다.

타임아웃 시 `PoolException`이 발생합니다.

### 논블로킹 tryAcquire

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "All resources are busy, let's try later\n";
} else {
    // 리소스 사용
    $pool->release($resource);
}
```

`tryAcquire()`는 리소스를 사용할 수 없는 경우 즉시 `null`을 반환합니다. 코루틴은 일시 중단되지 않습니다.

### Release

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // 중요: 항상 리소스를 풀에 반환하세요!
    $pool->release($resource);
}
```

`beforeRelease`가 설정되어 있고 `false`를 반환하면, 리소스는 손상된 것으로 간주되어
풀에 반환되는 대신 파괴됩니다.

## 통계

```php
echo $pool->count();       // 총 리소스 (유휴 + 사용 중)
echo $pool->idleCount();   // 유휴, 제공 준비 완료
echo $pool->activeCount(); // 현재 코루틴이 사용 중
```

## 풀 닫기

```php
$pool->close();
```

닫을 때:
- 모든 대기 중인 코루틴이 `PoolException`을 받음
- 모든 유휴 리소스가 `destructor`를 통해 파괴됨
- 사용 중인 리소스는 이후 `release` 시 파괴됨

## Healthcheck: 백그라운드 검사

`healthcheckInterval`이 설정되면 풀이 유휴 리소스를 주기적으로 검사합니다.
죽은 리소스는 파괴되고 새 것으로 교체됩니다 (수량이 `min` 아래로 떨어진 경우).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // 확인: 연결이 살아있는지?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // 10초마다
);
```

Healthcheck는 **유휴** 리소스에만 작동합니다. 사용 중인 리소스는 검사하지 않습니다.

## 서킷 브레이커

풀은 서비스 가용성 관리를 위한 **서킷 브레이커** 패턴을 구현합니다.

### 세 가지 상태

| 상태         | 동작                                                    |
|--------------|--------------------------------------------------------|
| `ACTIVE`     | 모든 것이 작동, 요청이 통과                               |
| `INACTIVE`   | 서비스 사용 불가, `acquire()`가 예외를 발생                |
| `RECOVERING` | 테스트 모드, 제한된 요청                                  |

```php
use Async\CircuitBreakerState;

// 상태 확인
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// 수동 제어
$pool->deactivate();  // INACTIVE로 전환
$pool->recover();     // RECOVERING으로 전환
$pool->activate();    // ACTIVE로 전환
```

### 전략을 통한 자동 관리

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

전략은 자동으로 호출됩니다:
- `reportSuccess()` -- 리소스가 풀에 성공적으로 반환될 때
- `reportFailure()` -- `beforeRelease`가 `false`를 반환할 때 (리소스 손상)

## 리소스 수명 주기

![리소스 수명 주기](/diagrams/ko/components-pool/resource-lifecycle.svg)

## 실전 예제: Redis 연결 풀

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100개의 코루틴이 20개의 연결을 통해 Redis에서 동시에 읽기
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO 풀

PDO의 경우, 풀링을 완전히 투명하게 만드는 `Async\Pool`과의 내장 통합이 있습니다.
수동 `acquire`/`release` 대신 풀이 뒤에서 자동으로 관리됩니다.

자세히 보기: [PDO 풀](/ko/docs/components/pdo-pool.html)

## 다음 단계

- [Async\Pool 아키텍처](/ko/architecture/pool.html) -- 내부 구조, 다이어그램, C API
- [PDO 풀](/ko/docs/components/pdo-pool.html) -- PDO를 위한 투명 풀
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴 작동 방식
- [채널](/ko/docs/components/channels.html) -- 코루틴 간 데이터 교환
