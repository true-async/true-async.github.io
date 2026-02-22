---
layout: docs
lang: ko
path_key: "/docs/components/exceptions.html"
nav_active: docs
permalink: /ko/docs/components/exceptions.html
page_title: "예외"
description: "TrueAsync 예외 계층 -- AsyncCancellation, TimeoutException, DeadlockError 등."
---

# 예외

## 계층 구조

TrueAsync는 다양한 유형의 오류를 위한 전문화된 예외 계층을 정의합니다:

```
\Cancellation                              -- 기본 취소 클래스 (\Error 및 \Exception과 동급)
+-- Async\AsyncCancellation                -- 코루틴 취소

\Error
+-- Async\DeadlockError                    -- 데드락 감지

\Exception
+-- Async\AsyncException                   -- 일반 비동기 작업 오류
|   +-- Async\ServiceUnavailableException  -- 서비스 사용 불가 (서킷 브레이커)
+-- Async\InputOutputException             -- I/O 오류
+-- Async\DnsException                     -- DNS 해석 오류
+-- Async\TimeoutException                 -- 작업 타임아웃
+-- Async\PollException                    -- poll 작업 오류
+-- Async\ChannelException                 -- 채널 오류
+-- Async\PoolException                    -- 리소스 풀 오류
+-- Async\CompositeException               -- 여러 예외의 컨테이너
```

## AsyncCancellation

```php
class Async\AsyncCancellation extends \Cancellation {}
```

코루틴이 취소될 때 발생합니다. `\Cancellation`은 `\Error` 및 `\Exception`과 동급인 세 번째 루트 `Throwable` 클래스이므로, 일반 `catch (\Exception $e)` 및 `catch (\Error $e)` 블록은 취소를 실수로 잡지 **않습니다**.

```php
<?php
use Async\AsyncCancellation;
use function Async\spawn;
use function Async\await;
use function Async\delay;

$coroutine = spawn(function() {
    try {
        delay(10000);
    } catch (AsyncCancellation $e) {
        // 작업을 정상적으로 마무리
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

delay(100);
$coroutine->cancel();
?>
```

**중요:** 다시 던지지 않고 `catch (\Throwable $e)`로 `AsyncCancellation`을 잡지 마세요 -- 이는 협력적 취소 메커니즘을 위반합니다.

## DeadlockError

```php
class Async\DeadlockError extends \Error {}
```

스케줄러가 데드락을 감지했을 때 발생합니다 -- 코루틴들이 서로를 기다리고 있어 아무도 진행할 수 없는 상황입니다.

```php
<?php
use function Async\spawn;
use function Async\await;

// 클래식 데드락: 두 코루틴이 서로를 기다림
$c1 = spawn(function() use (&$c2) {
    await($c2); // c2를 기다림
});

$c2 = spawn(function() use (&$c1) {
    await($c1); // c1을 기다림
});
// DeadlockError: A deadlock was detected
?>
```

코루틴이 자기 자신을 기다리는 예제:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() use (&$coroutine) {
    await($coroutine); // 자기 자신을 기다림
});
// DeadlockError
?>
```

## AsyncException

```php
class Async\AsyncException extends \Exception {}
```

일반 비동기 작업 오류의 기본 예외입니다. 전문화된 카테고리에 속하지 않는 오류에 사용됩니다.

## TimeoutException

```php
class Async\TimeoutException extends \Exception {}
```

타임아웃이 초과되면 발생합니다. `timeout()`이 트리거될 때 자동으로 생성됩니다:

```php
<?php
use Async\TimeoutException;
use function Async\spawn;
use function Async\await;
use function Async\timeout;
use function Async\delay;

try {
    $coroutine = spawn(function() {
        delay(10000); // 긴 작업
    });
    await($coroutine, timeout(1000)); // 1초 타임아웃
} catch (TimeoutException $e) {
    echo "Operation didn't complete in time\n";
}
?>
```

## InputOutputException

```php
class Async\InputOutputException extends \Exception {}
```

I/O 오류에 대한 일반 예외: 소켓, 파일, 파이프 및 기타 I/O 디스크립터.

## DnsException

```php
class Async\DnsException extends \Exception {}
```

DNS 해석 오류 시 발생합니다 (`gethostbyname`, `gethostbyaddr`, `gethostbynamel`).

## PollException

```php
class Async\PollException extends \Exception {}
```

디스크립터에 대한 poll 작업 오류 시 발생합니다.

## ServiceUnavailableException

```php
class Async\ServiceUnavailableException extends Async\AsyncException {}
```

서킷 브레이커가 `INACTIVE` 상태이고 서비스 요청이 실행 시도 없이 거부될 때 발생합니다.

```php
<?php
use Async\ServiceUnavailableException;

try {
    $resource = $pool->acquire();
} catch (ServiceUnavailableException $e) {
    echo "Service is temporarily unavailable\n";
}
?>
```

## ChannelException

```php
class Async\ChannelException extends Async\AsyncException {}
```

채널 작업 오류 시 발생합니다: 닫힌 채널로 보내기, 닫힌 채널에서 받기 등.

## PoolException

```php
class Async\PoolException extends Async\AsyncException {}
```

리소스 풀 작업 오류 시 발생합니다.

## CompositeException

```php
final class Async\CompositeException extends \Exception
{
    public function addException(\Throwable $exception): void;
    public function getExceptions(): array;
}
```

여러 예외의 컨테이너입니다. 여러 핸들러(예: Scope의 `finally`)가 완료 중에 예외를 던질 때 사용됩니다:

```php
<?php
use Async\Scope;
use Async\CompositeException;

$scope = new Scope();

$scope->finally(function() {
    throw new \Exception('Cleanup error 1');
});

$scope->finally(function() {
    throw new \RuntimeException('Cleanup error 2');
});

$scope->setExceptionHandler(function($scope, $coroutine, $exception) {
    if ($exception instanceof CompositeException) {
        echo "Errors: " . count($exception->getExceptions()) . "\n";
        foreach ($exception->getExceptions() as $e) {
            echo "  - " . $e->getMessage() . "\n";
        }
    }
});

$scope->dispose();
// Errors: 2
//   - Cleanup error 1
//   - Cleanup error 2
?>
```

## 권장 사항

### AsyncCancellation 올바르게 처리하기

```php
<?php
// 올바른 방법: 특정 예외를 잡기
try {
    await($coroutine);
} catch (\Exception $e) {
    // AsyncCancellation은 여기서 잡히지 않음 -- \Cancellation이므로
    handleError($e);
}
```

```php
<?php
// 모든 것을 잡아야 하는 경우 -- 항상 AsyncCancellation을 다시 던지기
try {
    await($coroutine);
} catch (Async\AsyncCancellation $e) {
    throw $e; // 다시 던지기
} catch (\Throwable $e) {
    handleError($e);
}
```

### 크리티컬 섹션 보호

취소에 의해 중단되어서는 안 되는 작업에 `protect()`를 사용합니다:

```php
<?php
use function Async\protect;

$db->beginTransaction();

protect(function() use ($db) {
    $db->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $db->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $db->commit();
});
```

## 참고

- [취소](/ko/docs/components/cancellation.html) -- 코루틴 취소 메커니즘
- [protect()](/ko/docs/reference/protect.html) -- 취소로부터 보호
- [Scope](/ko/docs/components/scope.html) -- 스코프에서의 예외 처리
