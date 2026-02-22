---
layout: docs
lang: ko
path_key: "/docs/components/scope.html"
nav_active: docs
permalink: /ko/docs/components/scope.html
page_title: "Scope"
description: "TrueAsync의 Scope -- 코루틴 수명 관리, 계층 구조, 그룹 취소, 오류 처리 및 구조적 동시성."
---

# Scope: 코루틴 수명 관리

## 문제: 명시적 리소스 제어, 잊혀진 코루틴

```php
function processUser($userId) {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    return "OK";
}

processUser(123);
// 함수는 반환되었지만 세 개의 코루틴이 여전히 실행 중입니다!
// 누가 이것들을 감시하고 있나요? 언제 끝날까요?
// 예외가 발생하면 누가 처리할까요?
```

비동기 프로그래밍에서 흔한 문제 중 하나는 개발자가 실수로 코루틴을 "잊어버리는" 것입니다.
코루틴이 실행되어 작업을 수행하지만, 아무도 그 생명주기를 모니터링하지 않습니다.
이는 리소스 누수, 불완전한 작업, 찾기 어려운 버그로 이어질 수 있습니다.
`stateful` 애플리케이션의 경우 이 문제는 매우 심각합니다.

## 해결책: Scope

![Scope 개념](../../../assets/docs/scope_concept.jpg)

**Scope** -- 코루틴을 실행하기 위한 논리적 공간으로, 샌드박스에 비유할 수 있습니다.

다음 규칙들이 코루틴이 제어 하에 있음을 보장합니다:
* 코드는 항상 어떤 `Scope`에서 실행되고 있는지 알고 있습니다
* `spawn()` 함수는 현재 `Scope`에서 코루틴을 생성합니다
* `Scope`는 자신에게 속한 모든 코루틴을 알고 있습니다

```php
function processUser($userId):string {
    spawn(sendEmail(...), $userId);
    spawn(updateCache(...), $userId);
    spawn(logActivity(...), $userId);

    // scope 내의 모든 코루틴이 완료될 때까지 대기
    $scope->awaitCompletion(new Async\Timeout(1000));

    return "OK";
}

$scope = new Async\Scope();
$scope->spawn(processUser(...), 123);
$scope->awaitCompletion(new Async\Timeout(5000));

// 이제 함수는 모든 코루틴이 완료된 후에만 반환됩니다
```

## 객체에 바인딩

`Scope`를 객체에 바인딩하여 코루틴 그룹의 소유권을 명시적으로 표현하는 것이 편리합니다.
이러한 의미론은 프로그래머의 의도를 직접적으로 표현합니다.

```php
class UserService
{
    // 하나의 고유 객체만이 고유한 Scope를 소유합니다
    // 코루틴은 UserService 객체와 동일한 수명을 가집니다
    private Scope $scope;

    public function __construct() {
        // 모든 서비스 코루틴을 위한 돔을 생성합니다
        $this->scope = new Async\Scope();
    }

    public function sendNotification($userId) {
        // 돔 내부에서 코루틴을 실행합니다
        $this->scope->spawn(function() use ($userId) {
            // 이 코루틴은 UserService에 바인딩되어 있습니다
            sendEmail($userId);
        });
    }

    public function __destruct() {
        // 객체가 삭제되면 리소스가 확실히 정리됩니다
        // 내부의 모든 코루틴이 자동으로 취소됩니다
        $this->scope->dispose();
    }
}

$service = new UserService();
$service->sendNotification(123);
$service->sendNotification(456);

// 서비스를 삭제하면 모든 코루틴이 자동으로 취소됩니다
unset($service);
```

## Scope 계층 구조

스코프는 다른 스코프를 포함할 수 있습니다. 부모 스코프가 취소되면
모든 자식 스코프와 그 코루틴도 취소됩니다.

이 접근 방식을 **구조적 동시성**이라고 합니다.

```php
$mainScope = new Async\Scope();

$mainScope->spawn(function() {
    echo "메인 작업\n";

    // 자식 스코프 생성
    $childScope = Async\Scope::inherit();

    $childScope->spawn(function() {
        echo "하위 작업 1\n";
    });

    $childScope->spawn(function() {
        echo "하위 작업 2\n";
    });

    // 하위 작업 완료 대기
    $childScope->awaitCompletion();

    echo "모든 하위 작업 완료\n";
});

$mainScope->awaitCompletion();
```

`$mainScope`를 취소하면 모든 자식 스코프도 취소됩니다. 전체 계층 구조가 취소됩니다.

## Scope 내 모든 코루틴 취소

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        while (true) {
            echo "작업 중...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "취소되었습니다!\n";
    }
});

$scope->spawn(function() {
    try {
        while (true) {
            echo "역시 작업 중...\n";
            Async\sleep(1000);
        }
    } catch (Async\AsyncCancellation $e) {
        echo "저도요!\n";
    }
});

// 3초 동안 작업
Async\sleep(3000);

// scope 내의 모든 코루틴 취소
$scope->cancel();

// 두 코루틴 모두 AsyncCancellation을 수신합니다
```

## Scope의 오류 처리

스코프 내의 코루틴이 오류로 실패하면 스코프가 이를 잡을 수 있습니다:

```php
$scope = new Async\Scope();

// 오류 핸들러 설정
$scope->setExceptionHandler(function(Throwable $e) {
    echo "스코프 내 오류: " . $e->getMessage() . "\n";
    // 로그 기록, Sentry로 전송 등이 가능합니다
});

$scope->spawn(function() {
    throw new Exception("뭔가 고장났습니다!");
});

$scope->spawn(function() {
    echo "저는 정상 작동 중입니다\n";
});

$scope->awaitCompletion();

// 출력:
// 스코프 내 오류: 뭔가 고장났습니다!
// 저는 정상 작동 중입니다
```

## Finally: 보장된 정리

스코프가 취소되더라도 finally 블록은 실행됩니다:

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    try {
        echo "작업 시작\n";
        Async\sleep(10000); // 긴 작업
        echo "완료\n"; // 실행되지 않음
    } finally {
        // 이것은 반드시 실행됩니다
        echo "리소스 정리 중\n";
        closeConnection();
    }
});

Async\sleep(1000);
$scope->cancel(); // 1초 후 취소

// 출력:
// 작업 시작
// 리소스 정리 중
```

## TaskGroup: 결과가 있는 Scope

`TaskGroup` -- 결과 집계가 가능한 병렬 작업 실행을 위한 특화된 스코프입니다.
동시성 제한, 이름이 있는 작업, 세 가지 대기 전략을 지원합니다:

```php
$group = new Async\TaskGroup(concurrency: 5);

$group->spawn(fn() => fetchUser(1));
$group->spawn(fn() => fetchUser(2));
$group->spawn(fn() => fetchUser(3));

// 모든 결과 가져오기 (모든 작업 완료 대기)
$results = await($group->all());

// 또는 첫 번째 완료된 결과 가져오기
$first = await($group->race());

// 또는 첫 번째 성공한 결과 가져오기 (오류 무시)
$any = await($group->any());
```

작업에 키를 추가하고 완료되는 대로 반복할 수 있습니다:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user', fn() => fetchUser(1));
$group->spawnWithKey('orders', fn() => fetchOrders(1));

// 결과가 준비되는 대로 반복
foreach ($group as $key => [$result, $error]) {
    if ($error) {
        echo "작업 $key 실패: {$error->getMessage()}\n";
    } else {
        echo "작업 $key: $result\n";
    }
}
```

## 글로벌 Scope: 항상 부모가 있습니다

스코프를 명시적으로 지정하지 않으면 코루틴은 **글로벌 스코프**에서 생성됩니다:

```php
// 스코프를 지정하지 않은 경우
spawn(function() {
    echo "글로벌 스코프에 있습니다\n";
});

// 이것과 동일합니다:
Async\Scope::global()->spawn(function() {
    echo "글로벌 스코프에 있습니다\n";
});
```

글로벌 스코프는 전체 요청 동안 유지됩니다. PHP가 종료되면 글로벌 스코프의 모든 코루틴이 정상적으로 취소됩니다.

## 실제 사례: HTTP 클라이언트

```php
class HttpClient {
    private Scope $scope;

    public function __construct() {
        $this->scope = new Async\Scope();
    }

    public function get(string $url): Async\Awaitable {
        return $this->scope->spawn(function() use ($url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            try {
                return curl_exec($ch);
            } finally {
                curl_close($ch);
            }
        });
    }

    public function cancelAll(): void {
        // 모든 활성 요청 취소
        $this->scope->cancel();
    }

    public function __destruct() {
        // 클라이언트가 파괴되면 모든 요청이 자동으로 취소됩니다
        $this->scope->dispose();
    }
}

$client = new HttpClient();

$req1 = $client->get('https://api1.com/data');
$req2 = $client->get('https://api2.com/data');
$req3 = $client->get('https://api3.com/data');

// 모든 요청 취소
$client->cancelAll();

// 또는 클라이언트를 파괴 - 동일한 효과
unset($client);
```

## 구조적 동시성

`Scope`는 **구조적 동시성(Structured Concurrency)** 원칙을 구현합니다 --
`Kotlin`, `Swift`, `Java`의 프로덕션 런타임에서 검증된 동시 작업 관리 규칙 세트입니다.

### 수명 관리 API

`Scope`는 다음 메서드를 사용하여 코루틴 계층 구조의 수명을 명시적으로 제어할 수 있는 기능을 제공합니다:

| 메서드                                    | 기능                                                             |
|------------------------------------------|------------------------------------------------------------------|
| `$scope->spawn(Closure, ...$args)`       | Scope 내에서 코루틴을 실행합니다                                   |
| `$scope->awaitCompletion($cancellation)` | Scope 내의 모든 코루틴 완료를 대기합니다                            |
| `$scope->cancel()`                       | 모든 코루틴에 취소 신호를 보냅니다                                  |
| `$scope->dispose()`                      | Scope를 닫고 모든 코루틴을 강제 취소합니다                          |
| `$scope->disposeSafely()`               | Scope를 닫습니다; 코루틴은 취소되지 않고 좀비로 표시됩니다           |
| `$scope->awaitAfterCancellation()`       | 좀비를 포함한 모든 코루틴 완료를 대기합니다                         |
| `$scope->disposeAfterTimeout(int $ms)`   | 타임아웃 후 코루틴을 취소합니다                                    |

이러한 메서드를 통해 세 가지 핵심 패턴을 구현할 수 있습니다:

**1. 부모가 모든 자식 작업을 대기**

```php
$scope = new Async\Scope();
$scope->spawn(function() { /* 작업 1 */ });
$scope->spawn(function() { /* 작업 2 */ });

// 두 작업이 모두 완료될 때까지 제어가 반환되지 않습니다
$scope->awaitCompletion();
```

Kotlin에서는 `coroutineScope { }`로,
Swift에서는 `withTaskGroup { }`으로 동일한 작업을 수행합니다.

**2. 부모가 모든 자식 작업을 취소**

```php
$scope->cancel();
// $scope 내의 모든 코루틴이 취소 신호를 받습니다.
// 자식 Scope도 취소됩니다 -- 재귀적으로, 어떤 깊이든.
```

**3. 부모가 Scope를 닫고 리소스를 해제**

`dispose()`는 Scope를 닫고 모든 코루틴을 강제 취소합니다:

```php
$scope->dispose();
// Scope가 닫혔습니다. 모든 코루틴이 취소되었습니다.
// 이 Scope에 새 코루틴을 추가할 수 없습니다.
```

Scope를 닫되 현재 코루틴이 **작업을 완료**할 수 있도록 하려면
`disposeSafely()`를 사용하세요 -- 코루틴은 좀비로 표시됩니다
(취소되지 않고 계속 실행되지만, Scope는 활성 작업 기준으로 완료된 것으로 간주됩니다):

```php
$scope->disposeSafely();
// Scope가 닫혔습니다. 코루틴은 좀비로 계속 작동합니다.
// Scope는 이들을 추적하지만 활성으로 계산하지 않습니다.
```

### 오류 처리: 두 가지 전략

코루틴에서 처리되지 않은 예외는 사라지지 않습니다 -- 부모 Scope로 전파됩니다.
다른 런타임은 다른 전략을 제공합니다:

| 전략                                                             | Kotlin            | Swift                   | TrueAsync                          |
|------------------------------------------------------------------|-------------------|-------------------------|------------------------------------|
| **함께 실패**: 하나의 자식 오류가 다른 모든 것을 취소              | `coroutineScope`  | `withThrowingTaskGroup` | `Scope` (기본값)                    |
| **독립적 자식**: 하나의 오류가 다른 것에 영향을 주지 않음          | `supervisorScope` | 별도의 `Task`            | `$scope->setExceptionHandler(...)` |

전략을 선택할 수 있는 기능이 "fire and forget"과의 핵심적인 차이점입니다.

### 컨텍스트 상속

자식 작업은 자동으로 부모의 컨텍스트를 받습니다:
우선순위, 기한, 메타데이터 -- 명시적으로 매개변수를 전달하지 않아도 됩니다.

Kotlin에서 자식 코루틴은 부모의 `CoroutineContext`(디스패처, 이름, `Job`)를 상속합니다.
Swift에서 자식 `Task` 인스턴스는 우선순위와 태스크 로컬 값을 상속합니다.

### 이미 적용된 곳

| 언어       | API                                                             | 프로덕션 도입 시기  |
|------------|-----------------------------------------------------------------|---------------------|
| **Kotlin** | `coroutineScope`, `supervisorScope`                             | 2018                |
| **Swift**  | `TaskGroup`, `withThrowingTaskGroup`                            | 2021                |
| **Java**   | `StructuredTaskScope` ([JEP 453](https://openjdk.org/jeps/453)) | 2023 (프리뷰)       |

TrueAsync는 `Async\Scope`를 통해 이 접근 방식을 PHP에 도입합니다.

## 다음 단계

- [코루틴](/ko/docs/components/coroutines.html) -- 코루틴의 작동 방식
- [취소](/ko/docs/components/cancellation.html) -- 취소 패턴
- [좀비 코루틴](/ko/docs/components/zombie-coroutines.html) -- 서드파티 코드에 대한 내결함성
