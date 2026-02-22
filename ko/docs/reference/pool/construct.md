---
layout: docs
lang: ko
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /ko/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "새 리소스 풀을 생성합니다."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

새 리소스 풀을 생성합니다. 풀은 재사용 가능한 객체 집합
(연결, 클라이언트, 파일 디스크립터 등)을 관리하며, 필요에 따라
자동으로 생성하고 파괴합니다.

## 매개변수

**factory**
: 새 리소스를 생성하는 팩토리 함수. 풀이 새 리소스를 필요로 하고
  현재 수가 `max`보다 작을 때마다 호출됩니다.
  사용 준비된 리소스를 반환해야 합니다.

**destructor**
: 리소스를 올바르게 파괴하는 함수. 풀이 닫힐 때 또는 리소스가
  제거될 때(예: 상태 검사 실패 후) 호출됩니다.
  `null` --- 추가 작업 없이 풀에서 리소스가 단순히 제거됩니다.

**healthcheck**
: 리소스 상태 검사 함수. 리소스를 받아 `bool`을 반환합니다.
  `true` --- 리소스가 정상, `false` --- 리소스가 파괴되고 교체됩니다.
  `null` --- 상태 검사를 수행하지 않습니다.

**beforeAcquire**
: 리소스가 배포되기 전에 호출되는 훅. 리소스를 받습니다.
  리소스 준비(예: 상태 초기화)에 사용할 수 있습니다.
  `null` --- 훅 없음.

**beforeRelease**
: 리소스가 풀에 반환되기 전에 호출되는 훅. 리소스를 받고
  `bool`을 반환합니다. `false`를 반환하면 리소스가 풀에 반환되는 대신
  파괴됩니다.
  `null` --- 훅 없음.

**min**
: 풀의 최소 리소스 수. 풀이 생성될 때 `min`개의 리소스가
  즉시 생성됩니다. 기본값은 `0`입니다.

**max**
: 풀의 최대 리소스 수. 한도에 도달하면 `acquire()` 호출은
  리소스가 해제될 때까지 차단됩니다.
  기본값은 `10`입니다.

**healthcheckInterval**
: 백그라운드 리소스 상태 검사 간격(밀리초).
  `0` --- 백그라운드 검사 비활성화(획득 시에만 검사).

## 예제

### 예제 #1 PDO 연결 풀

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO is closed automatically when removed
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // 30초마다 검사
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### 예제 #2 훅이 있는 풀

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // 기본 데이터베이스로 초기화
    },
    beforeRelease: function(RedisClient $r): bool {
        // 연결이 끊어진 경우 — 리소스 파괴
        return $r->isConnected();
    },
    max: 5
);
```

## 같이 보기

- [Pool::acquire](/ko/docs/reference/pool/acquire.html) --- 풀에서 리소스 획득
- [Pool::release](/ko/docs/reference/pool/release.html) --- 풀에 리소스 반환
- [Pool::close](/ko/docs/reference/pool/close.html) --- 풀 닫기
