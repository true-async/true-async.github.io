---
layout: docs
lang: ko
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /ko/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — 새 코루틴에서 함수를 실행합니다. 전체 문서: 매개변수, 반환 값, 예제."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — 새 코루틴에서 함수를 실행합니다. 코루틴을 생성합니다.

## 설명

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

새 코루틴을 생성하고 시작합니다. 코루틴은 비동기적으로 실행됩니다.

## 매개변수

**`callback`**
코루틴에서 실행할 함수 또는 클로저입니다. 모든 유효한 callable 타입이 가능합니다.

**`args`**
`callback`에 전달되는 선택적 매개변수입니다. 매개변수는 값으로 전달됩니다.

## 반환 값

실행된 코루틴을 나타내는 `Async\Coroutine` 객체를 반환합니다. 이 객체를 사용하여:
- `await()`를 통해 결과를 가져올 수 있습니다
- `cancel()`을 통해 실행을 취소할 수 있습니다
- 코루틴의 상태를 확인할 수 있습니다

## 예제

### 예제 #1 spawn()의 기본 사용법

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// 코루틴은 비동기적으로 실행됩니다
echo "Coroutine started\n";

$result = await($coroutine);
echo "Result received\n";
?>
```

### 예제 #2 여러 코루틴

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// 모든 요청이 동시에 실행됩니다
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Downloaded: " . strlen($content) . " bytes\n";
}
?>
```

### 예제 #3 클로저와 함께 사용

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### 예제 #4 Scope와 함께 spawn 사용

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// 스코프 내의 모든 코루틴 완료를 대기합니다
$scope->awaitCompletion();
?>
```

### 예제 #5 매개변수 전달

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Sum: $result\n"; // Sum: 60
?>
```

### 예제 #6 오류 처리

코루틴에서 발생한 예외를 처리하는 한 가지 방법은 `await()` 함수를 사용하는 것입니다:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Random error");
    }
    return "Success";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## 참고

> **참고:** `spawn()`을 통해 생성된 코루틴은 동시에 실행되지만, 병렬로 실행되지는 않습니다.
> PHP TrueAsync는 단일 스레드 실행 모델을 사용합니다.

> **참고:** 매개변수는 코루틴에 값으로 전달됩니다.
> 참조로 전달하려면 `use (&$var)`가 있는 클로저를 사용하세요.

## 변경 이력

| 버전    | 설명                           |
|---------|-------------------------------|
| 1.0.0   | `spawn()` 함수가 추가되었습니다 |

## 같이 보기

- [await()](/ko/docs/reference/await.html) - 코루틴 결과 대기
- [suspend()](/ko/docs/reference/suspend.html) - 코루틴 실행 일시 중단
