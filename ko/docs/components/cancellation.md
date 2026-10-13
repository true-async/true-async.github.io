---
layout: docs
lang: ko
path_key: "/docs/components/cancellation.html"
nav_active: docs
permalink: /ko/docs/components/cancellation.html
page_title: "취소"
description: "TrueAsync의 코루틴 취소 -- 협력적 취소, protect()를 사용한 크리티컬 섹션, Scope를 통한 계단식 취소, 타임아웃."
---

# 취소

브라우저가 요청을 보냈지만 사용자가 페이지를 닫았습니다.
서버는 더 이상 필요하지 않은 요청을 계속 처리하고 있습니다.
불필요한 비용을 피하기 위해 작업을 중단하는 것이 좋을 것입니다.
또는 갑자기 취소해야 하는 장시간 데이터 복사 프로세스가 있다고 가정해 봅시다.
작업을 중단해야 하는 시나리오는 많습니다.
일반적으로 이 문제는 플래그 변수나 취소 토큰으로 해결하는데, 이는 상당히 노동 집약적입니다. 코드는
취소될 수 있다는 것을 알아야 하고, 취소 체크포인트를 계획해야 하며, 이러한 상황을 올바르게 처리해야 합니다.

## 설계부터 취소 가능

대부분의 시간 동안 애플리케이션은 데이터베이스, 파일 또는 네트워크에서
데이터를 읽는 데 바쁩니다. 읽기를 중단하는 것은 프로그램에는 안전하지만, 중단된 스트림 자체는 그 후에 닫아야 합니다(아래 참조).
따라서 `TrueAsync`에서는 다음과 같은 원칙이 적용됩니다: **코루틴은 대기 상태에서 언제든지 취소될 수 있습니다**.
이 접근 방식은 대부분의 경우 프로그래머가 취소에 대해 걱정할 필요가 없으므로
코드 양을 줄여줍니다.

## 취소 동작 방식

코루틴을 취소하기 위해 특별한 예외인 `Cancellation`이 사용됩니다.
`Cancellation` 예외 또는 그 파생 예외가 일시 중단 지점(`suspend()`, `await()`, `delay()`)에서 발생합니다.
I/O 작업이나 기타 차단 작업 중에도 실행이 중단될 수 있습니다.

```php
$coroutine = spawn(function() {
    echo "Starting work\n";
    suspend(); // 여기서 코루틴이 Cancellation을 받습니다
    echo "This won't happen\n";
});

$coroutine->cancel();

try {
    await($coroutine);
} catch (\Cancellation $e) {
    echo "Coroutine cancelled\n";
    throw $e;
}
```

## 취소는 억제할 수 없습니다

`Cancellation`은 `Error` 및 `Exception`과 동등한 기본 수준의 예외입니다.
`catch (Exception $e)` 구문으로는 이를 잡을 수 없습니다.

`Cancellation`을 잡고 작업을 계속하는 것은 오류입니다.
`catch Async\AsyncCancellation`을 사용하여 특수한 상황을 처리할 수 있지만,
예외를 올바르게 다시 던지는 것을 확인해야 합니다.
일반적으로 보장된 리소스 정리를 위해 `finally`를 사용하는 것이 권장됩니다:

```php
spawn(function() {
    $connection = connectToDatabase();

    try {
        processData($connection);
    } finally {
        $connection->close();
    }
});
```

## 스트림 작업 취소

대기 중에 취소된 스트림 읽기 또는 쓰기(`fread()`, `fgets()`, `stream_get_contents()`, `fwrite()` 등)는
스트림 데이터에 대해 아무것도 보장하지 않습니다. PHP는 스트림을 청크 단위로 자체 버퍼에 읽어 들입니다.
취소된 읽기는 이미 그 버퍼에서 바이트를 가져갔을 수 있으며, 그 바이트는 손실됩니다.
취소된 쓰기는 이미 데이터의 일부를 보냈을 수 있으며, 호출자는 그 양을 알 수 없습니다.
스트림은 열린 채로 남아 다시 사용할 수 있지만, 데이터에 빠진 부분이 있을 수 있습니다.

취소된 읽기 또는 쓰기 후에는 스트림을 계속 사용하지 말고 닫아야 합니다:

```php
spawn(function() use ($socket) {
    try {
        while (($line = fgets($socket)) !== false) {
            processLine($line);
        }
    } finally {
        fclose($socket);
    }
});
```

`ext/sockets` 함수(`socket_read()`, `socket_write()`, `socket_recv()`, `socket_send()` 등)도 마찬가지입니다.
취소된 호출은 이미 데이터를 받았거나 보냈을 수 있습니다. 소켓은 `socket_close()`로 닫아야 합니다.

## 세 가지 취소 시나리오

`cancel()`의 동작은 코루틴의 상태에 따라 달라집니다:

**코루틴이 아직 시작되지 않은 경우** -- 영원히 시작되지 않습니다.

```php
$coroutine = spawn(function() {
    echo "Won't execute\n";
});
$coroutine->cancel();
```

**코루틴이 대기 상태인 경우** -- `Cancellation` 예외와 함께 깨어납니다.

```php
$coroutine = spawn(function() {
    echo "Started work\n";
    suspend(); // 여기서 Cancellation을 받습니다
    echo "Won't execute\n";
});

suspend();
$coroutine->cancel();
```

**코루틴이 이미 완료된 경우** -- 아무 일도 일어나지 않습니다.

```php
$coroutine = spawn(function() {
    return 42;
});

await($coroutine);
$coroutine->cancel(); // 오류가 아니지만 효과 없음
```

## 크리티컬 섹션: protect()

모든 작업을 안전하게 중단할 수 있는 것은 아닙니다.
코루틴이 한 계좌에서 돈을 인출했지만 아직 다른 계좌에 입금하지 않은 경우 --
이 시점에서 취소하면 데이터 손실이 발생합니다.

`protect()` 함수는 크리티컬 섹션이 완료될 때까지 취소를 지연시킵니다:

```php
use Async\protect;
use Async\spawn;

$coroutine = spawn(function() {
    protect(function() {
        $db->query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
        suspend();
        $db->query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    });

    // 취소는 여기서 적용됩니다 -- protect()를 빠져나온 후
});

suspend();
$coroutine->cancel();
```

`protect()` 내부에서 코루틴은 보호 상태로 표시됩니다.
이 순간에 `cancel()`이 도착하면 취소가 저장되지만
적용되지 않습니다. `protect()`가 완료되자마자 --
지연된 취소가 즉시 적용됩니다.

## Scope를 통한 계단식 취소

`Scope`가 취소되면 모든 코루틴과 모든 하위 스코프가 취소됩니다.
계단식은 **하향식으로만** 진행됩니다 -- 하위 스코프를 취소해도 상위 또는 형제 스코프에는 영향을 미치지 않습니다.

### 격리: 하위 취소는 다른 것에 영향을 미치지 않음

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

// child1만 취소
$child1->cancel();

$parent->isCancelled(); // false -- 상위는 영향 없음
$child1->isCancelled(); // true
$child2->isCancelled(); // false -- 형제 스코프는 영향 없음
```

### 하향 계단식: 상위 취소는 모든 하위를 취소

```php
$parent = new Async\Scope();
$child1 = Async\Scope::inherit($parent);
$child2 = Async\Scope::inherit($parent);

$parent->cancel(); // 계단식: child1과 child2 모두 취소

$parent->isCancelled(); // true
$child1->isCancelled(); // true
$child2->isCancelled(); // true
```

### 코루틴은 자신의 Scope를 취소할 수 있습니다

코루틴은 자신이 실행되는 스코프의 취소를 시작할 수 있습니다. 가장 가까운 일시 중단 지점까지의 코드는 계속 실행됩니다:

```php
$scope = new Async\Scope();

$scope->spawn(function() use ($scope) {
    echo "Starting\n";
    $scope->cancel();
    echo "This will still execute\n";
    suspend();
    echo "But this won't\n";
});
```

취소 후 스코프는 닫힙니다 -- 더 이상 새 코루틴을 실행할 수 없습니다.

## 타임아웃

취소의 특수한 경우는 타임아웃입니다. `timeout()` 함수는 시간 제한을 생성합니다:

```php
$coroutine = spawn(function() {
    return file_get_contents('https://slow-api.example.com/data');
});

try {
    $result = await($coroutine, timeout(5000));
} catch (Async\OperationCanceledException $e) {
    // $e->getPrevious()에 TimeoutException 포함
    echo "API didn't respond within 5 seconds\n";
}
```

취소 토큰이 발동되면(타임아웃 포함) `OperationCanceledException`이 발생합니다. 토큰의 원래 예외는 `$e->getPrevious()`를 통해 확인할 수 있습니다. 이를 통해 토큰 발동과 awaitable 객체 자체의 오류를 구분할 수 있습니다.

## 상태 확인

코루틴은 취소를 확인하기 위한 두 가지 메서드를 제공합니다:

- `isCancellationRequested()` -- 취소가 요청되었지만 아직 적용되지 않음
- `isCancelled()` -- 코루틴이 실제로 중지됨

```php
$coroutine = spawn(function() {
    suspend();
});

$coroutine->cancel();

$coroutine->isCancellationRequested(); // true
$coroutine->isCancelled();             // false -- 아직 처리되지 않음

suspend();

$coroutine->isCancelled();             // true
```

## 예제: 정상 종료되는 큐 워커

```php
class QueueWorker {
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
        $this->queue = new Async\Channel();
    }

    public function start(): void {
        $this->scope->spawn(function() {
            while (true) {
                $job = $this->queue->receive();

                try {
                    $job->process();
                } finally {
                    $job->markDone();
                }
            }
        });
    }

    public function stop(): void
    {
        // 모든 코루틴이 여기서 중지됩니다
        $this->scope->cancel();
    }
}
```

## 다음 단계

- [Scope](/ko/docs/components/scope.html) -- 코루틴 그룹 관리
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴 수명 주기
- [채널](/ko/docs/components/channels.html) -- 코루틴 간 데이터 교환
