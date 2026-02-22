---
layout: docs
lang: ko
path_key: "/docs/components/zombie-coroutines.html"
nav_active: docs
permalink: /ko/docs/components/zombie-coroutines.html
page_title: "좀비 코루틴"
description: "TrueAsync의 좀비 코루틴 -- 서드파티 코드에 대한 내결함성, disposeSafely(), disposeAfterTimeout(), 취소 불가능한 작업 관리."
---

# 좀비 코루틴: 내결함성

## 문제: 취소할 수 없는 코드

코루틴 취소는 협력적인 프로세스입니다. 코루틴은 중단 지점에서 `Cancellation` 예외를 받고
정상적으로 종료해야 합니다. 하지만 누군가 실수로 잘못된 `Scope`에 코루틴을 생성했다면 어떻게 될까요?
`TrueAsync`는 `Cancellation by design` 원칙을 따르지만, 누군가 작성한 코드의
취소가 불쾌한 결과를 초래할 수 있는 상황이 발생할 수 있습니다.
예를 들어, 누군가 `email`을 보내는 백그라운드 작업을 생성했습니다. 코루틴이 취소되면 `email`은 전송되지 않습니다.

높은 내결함성은 개발 시간을 상당히 절약하고,
프로그래머가 로그 분석을 통해 애플리케이션 품질을 개선한다면 오류의 결과를 최소화합니다.

## 해결책: 좀비 코루틴

이러한 상황을 완화하기 위해 `TrueAsync`는 특별한 접근 방식을 제공합니다:
"멈춘" 코루틴에 대한 관용적 처리 -- 좀비 코루틴입니다.

`좀비` 코루틴은 다음과 같은 코루틴입니다:
* 정상적으로 계속 실행됩니다
* Scope에 바인딩된 상태로 유지됩니다
* 활성으로 간주되지 않습니다 -- Scope는 이를 기다리지 않고 공식적으로 완료할 수 있습니다
* `awaitCompletion()`을 차단하지 않지만, `awaitAfterCancellation()`은 차단합니다

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    thirdPartySync(); // 서드파티 코드 -- 취소에 어떻게 반응하는지 알 수 없음
});

$scope->spawn(function() {
    return myOwnCode(); // 우리 코드 -- 취소를 올바르게 처리함
});

// disposeSafely()는 코루틴을 취소하지 않고 좀비로 표시합니다
$scope->disposeSafely();
// Scope는 새 코루틴에 대해 닫혔습니다.
// 기존 코루틴은 좀비로 계속 작동합니다.
```

## Scope 종료를 위한 세 가지 전략

`TrueAsync`는 코드에 대한 신뢰 수준에 맞게 설계된 세 가지 `Scope` 닫기 방법을 제공합니다:

### `dispose()` -- 강제 취소

모든 코루틴이 `Cancellation`을 받습니다. Scope는 즉시 닫힙니다.
Scope 내의 모든 코드를 제어할 때 사용합니다.

```php
$scope->dispose();
// 모든 코루틴이 취소됩니다. Scope가 닫혔습니다.
```

### `disposeSafely()` -- 취소 없음, 코루틴이 좀비가 됨

코루틴은 `Cancellation`을 **받지 않습니다**. `zombie`로 표시되어 계속 실행됩니다.
`Scope`는 닫힌 것으로 간주됩니다 -- 새 코루틴을 생성할 수 없습니다.

`Scope`에 "서드파티" 코드가 포함되어 있고 취소의 정확성에 확신이 없을 때 사용합니다.

```php
$scope->disposeSafely();
// 코루틴은 좀비로 계속 작동합니다.
// Scope는 새 작업에 대해 닫혔습니다.
```

### `disposeAfterTimeout(int $timeout)` -- 타임아웃 포함 취소

두 접근 방식의 조합: 먼저 코루틴에게 완료할 시간을 주고,
그 다음 `Scope`를 강제로 취소합니다.

```php
$scope->disposeAfterTimeout(5000);
// 5초 후에 Scope는 남은 모든 코루틴에 Cancellation을 보냅니다.
```

## 좀비 코루틴 대기

`awaitCompletion()`은 **활성** 코루틴만 기다립니다. 모든 코루틴이 좀비가 되면
`awaitCompletion()`은 Scope가 완료된 것으로 간주하고 제어를 반환합니다.

하지만 때로는 좀비를 포함한 **모든** 코루틴의 완료를 기다려야 합니다.
이를 위해 `awaitAfterCancellation()`이 존재합니다:

```php
$scope = new Async\Scope();
$scope->spawn(fn() => longRunningTask());
$scope->spawn(fn() => anotherTask());

// 취소 -- 취소할 수 없는 코루틴은 좀비가 됩니다
$scope->cancel();

// awaitCompletion()은 좀비만 남으면 즉시 반환됩니다
$scope->awaitCompletion($cancellation);

// awaitAfterCancellation()은 좀비를 포함한 모든 것을 기다립니다
$scope->awaitAfterCancellation(function (\Throwable $error, Async\Scope $scope) {
    // 좀비 코루틴의 오류 핸들러
    echo "좀비 오류: " . $error->getMessage() . "\n";
});
```

| 메서드                        | 활성 대기 | 좀비 대기 | cancel() 필요 |
|------------------------------|:---------:|:---------:|:-------------:|
| `awaitCompletion()`          |    예     |   아니오   |    아니오      |
| `awaitAfterCancellation()`   |    예     |    예     |      예        |

`awaitAfterCancellation()`은 `cancel()` 이후에만 호출할 수 있습니다 -- 그렇지 않으면 오류가 발생합니다.
이는 합리적입니다: 좀비 코루틴은 `DISPOSE_SAFELY` 플래그를 사용한 취소의 결과로 나타납니다.

## 좀비의 내부 작동 방식

코루틴이 `zombie`로 표시되면 다음이 발생합니다:

1. 코루틴이 `ZOMBIE` 플래그를 받습니다
2. `Scope`의 활성 코루틴 카운터가 1 감소합니다
3. `zombie` 코루틴 카운터가 1 증가합니다
4. `Scope`는 활성 코루틴이 남아 있는지 확인하고 대기자에게 완료를 알릴 수 있습니다

```
Scope
+-- active_coroutines_count: 0    <-- 감소
+-- zombie_coroutines_count: 2    <-- 증가
+-- coroutine A (zombie)          <-- 계속 실행
+-- coroutine B (zombie)          <-- 계속 실행
```

`좀비` 코루틴은 `Scope`에서 **분리되지 않습니다**. 코루틴 목록에 남아 있지만
활성으로 계산되지 않습니다. `좀비` 코루틴이 최종적으로 완료되면
`Scope`에서 제거되고, `Scope`는 리소스를 완전히 해제할 수 있는지 확인합니다.

## 스케줄러가 좀비를 처리하는 방법

`스케줄러`는 두 개의 독립적인 코루틴 카운트를 유지합니다:

1. **글로벌 활성 코루틴 카운터** (`active_coroutine_count`) -- 스케줄링이 필요한
   작업이 있는지 빠르게 확인하는 데 사용됩니다
2. **코루틴 레지스트리** (`coroutines` 해시 테이블) -- `좀비`를 포함하여
   아직 실행 중인 **모든** 코루틴을 포함합니다

코루틴이 `zombie`로 표시될 때:
* 글로벌 활성 코루틴 카운터가 **감소합니다** -- 스케줄러는 활성 작업이 줄어든 것으로 간주합니다
* 코루틴은 레지스트리에 **남아 있습니다** -- `스케줄러`가 계속 실행을 관리합니다

애플리케이션은 활성 코루틴 카운터가 0보다 큰 동안 계속 실행됩니다. 중요한 결과가 따릅니다:
`좀비` 코루틴은 활성으로 간주되지 않으므로 애플리케이션 종료를 방해하지 않습니다.
더 이상 활성 코루틴이 없으면 애플리케이션이 종료되고 `좀비` 코루틴도 취소됩니다.

## Safely 플래그 상속

기본적으로 `Scope`는 `DISPOSE_SAFELY` 플래그와 함께 생성됩니다.
이는 `Scope`가 파괴될 때(예: 객체의 소멸자에서)
코루틴이 취소되지 않고 `좀비`가 됨을 의미합니다.

자식 `Scope`는 부모로부터 이 플래그를 상속합니다:

```php
$parent = new Async\Scope();
// parent는 기본적으로 DISPOSE_SAFELY 플래그를 가집니다

$child = Async\Scope::inherit($parent);
// child도 DISPOSE_SAFELY 플래그를 가집니다
```

파괴 시 강제 취소를 원하면 `asNotSafely()`를 사용하세요:

```php
$scope = (new Async\Scope())->asNotSafely();
// 이제 Scope 객체가 파괴되면
// 코루틴은 좀비로 표시되지 않고 강제로 취소됩니다
```

## 예제: 미들웨어가 있는 HTTP 서버

```php
class RequestHandler
{
    private Async\Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function handle(Request $request): Response {
        // 미들웨어 실행 -- 서드파티 코드일 수 있음
        $this->scope->spawn(function() use ($request) {
            $this->runMiddleware($request);
        });

        // 메인 처리 -- 우리 코드
        $response = $this->scope->spawn(function() use ($request) {
            return $this->processRequest($request);
        });

        return await($response);
    }

    public function __destruct() {
        // 파괴 시: 미들웨어가 취소에 준비되지 않았을 수 있으므로
        // disposeSafely()를 사용합니다 (기본 동작).
        // 좀비 코루틴은 스스로 완료됩니다.
        $this->scope->disposeSafely();
    }
}
```

## 예제: 시간 제한이 있는 핸들러

```php
$scope = new Async\Scope();

// 서드파티 코드로 작업 실행
$scope->spawn(fn() => thirdPartyAnalytics($data));
$scope->spawn(fn() => thirdPartyNotification($userId));

// 완료까지 10초를 주고, 그 후 강제 취소
$scope->disposeAfterTimeout(10000);
```

## 좀비가 문제가 되는 경우

`좀비` 코루틴은 타협입니다. 서드파티 코드 문제를 해결하지만
리소스 누수로 이어질 수 있습니다.

따라서 `disposeAfterTimeout()` 또는 명시적 코루틴 취소가 있는 `Scope`가 프로덕션에서 가장 좋은 선택입니다:
서드파티 코드에게 완료할 시간을 주지만 행에 걸린 경우 취소를 보장합니다.

## 요약

| 메서드                      | 코루틴 취소 | 코루틴 완료         | Scope 닫힘 |
|---------------------------|:----------:|:------------------:|:----------:|
| `dispose()`               |     예     |      아니오         |     예     |
| `disposeSafely()`         |   아니오    | 예 (좀비로서)        |     예     |
| `disposeAfterTimeout(ms)` | 타임아웃 후  | 타임아웃까지         |     예     |

## 좀비 코루틴 로깅

향후 버전에서 `TrueAsync`는 좀비 코루틴을 로깅하는 메커니즘을 제공할 예정이며,
이를 통해 개발자가 멈춘 작업과 관련된 문제를 해결할 수 있습니다.

## 다음 단계

- [Scope](/ko/docs/components/scope.html) -- 코루틴 그룹 관리
- [취소](/ko/docs/components/cancellation.html) -- 취소 패턴
- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴 생명주기
