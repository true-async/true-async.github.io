---
layout: docs
lang: ko
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /ko/docs/components/pdo-pool.html
page_title: "PDO 풀"
description: "PDO 풀 -- 코루틴을 위한 내장 데이터베이스 연결 풀: 투명한 풀링, 트랜잭션, 자동 롤백."
---

# PDO 풀: 데이터베이스 연결 풀

## 문제

코루틴으로 작업할 때 I/O 디스크립터 공유 문제가 발생합니다.
두 코루틴이 같은 소켓을 동시에 사용하여 서로 다른 패킷을 쓰거나 읽으면,
데이터가 섞이고 결과를 예측할 수 없게 됩니다.
따라서 동일한 `PDO` 객체를 다른 코루틴에서 단순히 사용할 수 없습니다!

반면, 각 코루틴마다 별도의 연결을 반복해서 생성하는 것은 매우 낭비적인 전략입니다.
이는 동시 I/O의 장점을 상쇄합니다. 따라서 외부 API, 데이터베이스 및
기타 리소스와 상호 작용하기 위해 일반적으로 연결 풀이 사용됩니다.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// 10개의 코루틴이 동시에 같은 $pdo를 사용
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // 다른 코루틴이 이미 이 동일한 연결에서 COMMIT을 호출했습니다!
        $pdo->commit(); // 혼란
    });
}
```

각 코루틴에서 별도의 연결을 만들 수 있지만, 천 개의 코루틴이 있으면 천 개의 TCP 연결이 됩니다.
MySQL은 기본적으로 151개의 동시 연결을 허용합니다. PostgreSQL은 100개입니다.

## 해결책: PDO 풀

**PDO 풀** -- PHP 코어에 내장된 데이터베이스 연결 풀입니다.
미리 준비된 세트에서 각 코루틴에 자동으로 자체 연결을 제공하고
코루틴이 작업을 마치면 다시 반환합니다.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// 10개의 코루틴 -- 각각 자체 연결을 받음
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // 풀이 이 코루틴에 대한 연결을 자동으로 할당
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // 연결이 풀로 반환됨
    });
}
```

외부에서 코드는 일반 `PDO`로 작업하는 것처럼 보입니다. 풀은 완전히 투명합니다.

## 활성화 방법

풀은 `PDO` 생성자 속성을 통해 활성화됩니다:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // 풀 활성화
    PDO::ATTR_POOL_MIN                  => 0,     // 최소 연결 수 (기본값 0)
    PDO::ATTR_POOL_MAX                  => 10,    // 최대 연결 수 (기본값 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // 상태 확인 간격 (초, 0 = 비활성화)
]);
```

| 속성                        | 의미                                                                  | 기본값  |
|-----------------------------|----------------------------------------------------------------------|---------|
| `POOL_ENABLED`              | 풀 활성화                                                             | `false` |
| `POOL_MIN`                  | 풀이 열어두는 최소 연결 수                                              | `0`     |
| `POOL_MAX`                  | 최대 동시 연결 수                                                      | `10`    |
| `POOL_HEALTHCHECK_INTERVAL` | 연결이 살아있는지 확인하는 빈도 (초 단위)                                | `0`     |

## 코루틴에 연결 바인딩

각 코루틴은 풀에서 **자체** 연결을 받습니다. 단일 코루틴 내의 `query()`, `exec()`, `prepare()` 모든 호출은 동일한 연결을 통해 이루어집니다.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // 세 가지 쿼리 모두 연결 #1을 통해
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // 코루틴 완료 -- 연결 #1이 풀로 반환
});

$coro2 = spawn(function() use ($pdo) {
    // 모든 쿼리가 연결 #2를 통해
    $pdo->query("SELECT 4");
    // 코루틴 완료 -- 연결 #2가 풀로 반환
});
```

코루틴이 더 이상 연결을 사용하지 않는 경우(활성 트랜잭션이나 문이 없는 경우),
풀이 코루틴이 끝나기를 기다리지 않고 더 일찍 반환할 수 있습니다.

## 트랜잭션

트랜잭션은 일반 PDO와 동일하게 작동합니다. 하지만 풀은
트랜잭션이 활성인 동안 연결이 코루틴에 **고정**되어 풀로 돌아가지 않음을 보장합니다.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // 커밋 후에만 연결이 풀로 돌아갈 수 있음
});
```

### 자동 롤백

코루틴이 `commit()`을 호출하지 않고 종료되면, 풀이 연결을 풀에 반환하기 전에
자동으로 트랜잭션을 롤백합니다. 이는 실수로 인한 데이터 손실에 대한 보호 장치입니다.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // commit()을 잊음
    // 코루틴 완료 -- 풀이 자동으로 ROLLBACK 호출
});
```

## 연결 수명 주기

![풀에서의 연결 수명 주기](/diagrams/ko/components-pdo-pool/connection-lifecycle.svg)

내부 호출이 포함된 자세한 기술 다이어그램은 [PDO 풀 아키텍처](/ko/architecture/pdo-pool.html)에 있습니다.

## 풀 객체 접근

`getPool()` 메서드는 통계를 얻을 수 있는 `Async\Pool` 객체를 반환합니다:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool is active: " . get_class($pool) . "\n"; // Async\Pool
}
```

풀이 활성화되지 않은 경우 `getPool()`은 `null`을 반환합니다.

## 사용 시기

**PDO 풀을 사용해야 하는 경우:**
- 애플리케이션이 TrueAsync를 사용한 비동기 모드로 실행
- 여러 코루틴이 동시에 데이터베이스에 접근
- 데이터베이스 연결 수를 제한해야 하는 경우

**필요하지 않은 경우:**
- 애플리케이션이 동기식 (클래식 PHP)
- 하나의 코루틴만 데이터베이스로 작업
- 영구 연결이 사용되는 경우 (풀과 호환되지 않음)

## 지원 드라이버

| 드라이버     | 풀 지원 |
|--------------|---------|
| `pdo_mysql`  | 예      |
| `pdo_pgsql`  | 예      |
| `pdo_sqlite` | 예      |
| `pdo_odbc`   | 아니요  |

## 오류 처리

풀이 연결을 생성할 수 없는 경우 (잘못된 자격 증명, 사용할 수 없는 서버),
예외가 연결을 요청한 코루틴으로 전파됩니다:

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Failed to connect: " . $e->getMessage() . "\n";
    }
});
```

`POOL_MIN => 0`에 주의하세요: 최소값을 0보다 높게 설정하면 풀이
미리 연결을 생성하려고 시도하고 PDO 객체 생성 시 오류가 발생합니다.

## 실전 예제: 병렬 주문 처리

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// 처리할 주문 목록 가져오기
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // 각 코루틴이 풀에서 자체 연결을 받음
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// 모든 코루틴 완료 대기
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Order #$processedId processed\n";
}
```

10개의 주문이 동시에 처리되지만 최대 5개의 데이터베이스 연결을 통해서만 이루어집니다.
각 트랜잭션은 격리됩니다. 연결은 코루틴 간에 재사용됩니다.

## 다음 단계

- [인터랙티브 PDO 풀 데모](/ko/interactive/pdo-pool-demo.html) -- 연결 풀 작동의 시각적 데모
- [PDO 풀 아키텍처](/ko/architecture/pdo-pool.html) -- 풀 내부, 다이어그램, 연결 수명 주기
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴 작동 방식
- [Scope](/ko/docs/components/scope.html) -- 코루틴 그룹 관리
- [spawn()](/ko/docs/reference/spawn.html) -- 코루틴 실행
- [await()](/ko/docs/reference/await.html) -- 결과 대기
