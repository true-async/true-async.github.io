---
layout: docs
lang: ko
path_key: "/docs/components/interfaces.html"
nav_active: docs
permalink: /ko/docs/components/interfaces.html
page_title: "인터페이스"
description: "TrueAsync 기본 인터페이스 -- Awaitable, Completable, Timeout, ScopeProvider 및 SpawnStrategy."
---

# 기본 인터페이스

## Awaitable

```php
interface Async\Awaitable {}
```

대기할 수 있는 모든 객체를 위한 마커 인터페이스입니다. 메서드를 포함하지 않으며 타입 체크용으로 사용됩니다.
Awaitable 객체는 상태를 여러 번 변경할 수 있습니다. 즉, `multiple-shot` 객체입니다.

구현체: `Coroutine`, `Future`, `Channel`, `Timeout`.

## Completable

```php
interface Async\Completable extends Async\Awaitable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

`Awaitable`을 확장합니다. `Async\Completable` 객체는 상태를 한 번만 변경합니다 (`one-shot`).

구현체: `Coroutine`, `Future`, `Timeout`.

### cancel()

객체를 취소합니다. 선택적 `$cancellation` 매개변수를 통해 특정 취소 오류를 전달할 수 있습니다.

### isCompleted()

객체가 이미 완료되었으면 (성공적으로 또는 오류와 함께) `true`를 반환합니다.

### isCancelled()

객체가 취소되었으면 `true`를 반환합니다.

## Timeout

```php
final class Async\Timeout implements Async\Completable
{
    public function cancel(?AsyncCancellation $cancellation = null): void;
    public function isCompleted(): bool;
    public function isCancelled(): bool;
}
```

타임아웃 객체입니다. `timeout()` 함수를 통해 생성됩니다:

```php
<?php
use function Async\timeout;
use function Async\await;

// 5초 타임아웃 생성
$timer = timeout(5000);

// 대기 제한자로 사용
$result = await($coroutine, $timer);
```

`Timeout`은 `new`로 생성할 수 없으며 `timeout()`을 통해서만 가능합니다.

타임아웃이 트리거되면 `Async\TimeoutException`이 발생합니다.

### 타임아웃 취소

타임아웃이 더 이상 필요하지 않으면 취소할 수 있습니다:

```php
<?php
$timer = timeout(5000);

// ... 작업이 더 빨리 완료됨
$timer->cancel(); // 타이머 해제
```

## ScopeProvider

```php
interface Async\ScopeProvider
{
    public function provideScope(): ?Scope;
}
```

코루틴 생성을 위한 `Scope`를 제공할 수 있는 인터페이스입니다. `spawn_with()`와 함께 사용됩니다:

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class RequestScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }
}

$provider = new RequestScope();
$coroutine = spawn_with($provider, function() {
    echo "Working in the provided Scope\n";
});
?>
```

`provideScope()`가 `null`을 반환하면 코루틴은 현재 Scope에서 생성됩니다.

## SpawnStrategy

```php
interface Async\SpawnStrategy extends Async\ScopeProvider
{
    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array;
    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void;
}
```

수명 주기 훅으로 `ScopeProvider`를 확장합니다 -- 코루틴이 대기열에 추가되기 전후에 코드를 실행할 수 있습니다.

### beforeCoroutineEnqueue()

코루틴이 스케줄러 큐에 추가되기 **전에** 호출됩니다. 매개변수 배열을 반환합니다.

### afterCoroutineEnqueue()

코루틴이 큐에 추가된 **후에** 호출됩니다.

```php
<?php
use Async\SpawnStrategy;
use Async\Coroutine;
use Async\Scope;
use function Async\spawn_with;

class LoggingStrategy implements SpawnStrategy
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function beforeCoroutineEnqueue(Coroutine $coroutine, Scope $scope): array
    {
        echo "Coroutine #{$coroutine->getId()} will be created\n";
        return [];
    }

    public function afterCoroutineEnqueue(Coroutine $coroutine, Scope $scope): void
    {
        echo "Coroutine #{$coroutine->getId()} added to queue\n";
    }
}

$strategy = new LoggingStrategy();
spawn_with($strategy, function() {
    echo "Executing\n";
});
?>
```

## CircuitBreaker와 CircuitBreakerStrategy

이 인터페이스는 [Async\Pool](/ko/docs/components/pool.html) 문서에 설명되어 있습니다.

## 참고

- [코루틴](/ko/docs/components/coroutines.html) -- 동시성의 기본 단위
- [Scope](/ko/docs/components/scope.html) -- 코루틴 수명 관리
- [Future](/ko/docs/components/future.html) -- 결과의 약속
- [spawn_with()](/ko/docs/reference/spawn-with.html) -- 프로바이더를 사용한 코루틴 실행
