---
layout: docs
lang: ko
path_key: "/docs/reference/spawn-with.html"
nav_active: docs
permalink: /ko/docs/reference/spawn-with.html
page_title: "spawn_with()"
description: "spawn_with() — 지정된 Scope 또는 ScopeProvider에서 코루틴을 실행합니다."
---

# spawn_with

(PHP 8.6+, True Async 1.0)

`spawn_with()` — 지정된 `Scope` 또는 `ScopeProvider`에 바인딩된 새 코루틴에서 함수를 실행합니다.

## 설명

```php
spawn_with(Async\ScopeProvider $provider, callable $task, mixed ...$args): Async\Coroutine
```

`$provider`가 제공하는 Scope에서 새 코루틴을 생성하고 시작합니다. 이를 통해 코루틴이 실행될 Scope를 명시적으로 제어할 수 있습니다.

## 매개변수

**`provider`**
`Async\ScopeProvider` 인터페이스를 구현하는 객체입니다. 일반적으로 다음과 같습니다:
- `Async\Scope` — `Scope`가 `ScopeProvider`를 구현하므로 직접 사용
- `ScopeProvider`를 구현하는 사용자 정의 클래스
- 수명 주기 관리를 위한 `SpawnStrategy`를 구현하는 객체

**`task`**
코루틴에서 실행할 함수 또는 클로저입니다.

**`args`**
`task`에 전달되는 선택적 매개변수입니다.

## 반환 값

실행된 코루틴을 나타내는 `Async\Coroutine` 객체를 반환합니다.

## 오류/예외

- `Async\AsyncException` — Scope가 닫혔거나 취소된 경우
- `TypeError` — `$provider`가 `ScopeProvider`를 구현하지 않는 경우

## 예제

### 예제 #1 특정 Scope에서 실행

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$c1 = spawn_with($scope, function() {
    return file_get_contents('https://php.net');
});

$c2 = spawn_with($scope, function() {
    return file_get_contents('https://github.com');
});

// 스코프 내의 모든 코루틴 완료를 대기합니다
$scope->awaitCompletion();
?>
```

### 예제 #2 상속된 Scope

```php
<?php
use Async\Scope;
use function Async\spawn_with;

$parentScope = new Scope();
$childScope = Scope::inherit($parentScope);

spawn_with($childScope, function() {
    echo "자식 Scope에서 작업 중\n";
});

// 부모를 취소하면 자식도 취소됩니다
$parentScope->cancel();
?>
```

### 예제 #3 ScopeProvider와 함께 사용

```php
<?php
use Async\Scope;
use Async\ScopeProvider;
use function Async\spawn_with;

class WorkerScope implements ScopeProvider
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
        $this->scope->setExceptionHandler(function(\Throwable $e) {
            error_log("Worker error: " . $e->getMessage());
        });
    }

    public function provideScope(): Scope
    {
        return $this->scope;
    }

    public function shutdown(): void
    {
        $this->scope->disposeSafely();
    }
}

$worker = new WorkerScope();

spawn_with($worker, function() {
    // 관리되는 스코프에서 작업 중
});

$worker->shutdown();
?>
```

### 예제 #4 인수 전달

```php
<?php
use Async\Scope;
use function Async\spawn_with;
use function Async\await;

$scope = new Scope();

$coroutine = spawn_with($scope, function(string $url, int $timeout) {
    // 전달된 인수를 사용합니다
    return file_get_contents($url);
}, 'https://php.net', 5000);

$result = await($coroutine);
?>
```

## 참고

> **참고:** `ScopeProvider::provideScope()`가 `null`을 반환하면 코루틴은 현재 Scope에서 생성됩니다.

> **참고:** 닫혔거나 취소된 Scope에서는 코루틴을 생성할 수 없습니다 — 예외가 던져집니다.

## 같이 보기

- [spawn()](/ko/docs/reference/spawn.html) — 현재 Scope에서 코루틴 실행
- [Scope](/ko/docs/components/scope.html) — 코루틴 수명 관리
- [Interfaces](/ko/docs/components/interfaces.html) — ScopeProvider와 SpawnStrategy
