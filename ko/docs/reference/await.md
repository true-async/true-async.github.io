---
layout: docs
lang: ko
path_key: "/docs/reference/await.html"
nav_active: docs
permalink: /ko/docs/reference/await.html
page_title: "await()"
description: "await() — 코루틴 또는 Future의 완료를 대기합니다. 전체 문서: 매개변수, 예외, 예제."
---

# await

(PHP 8.6+, True Async 1.0)

`await()` — 코루틴, `Async\Future` 또는 기타 `Async\Completable`의 완료를 대기합니다.
결과를 반환하거나 예외를 던집니다.

## 설명

```php
await(Async\Completable $awaitable, ?Async\Completable $cancellation = null): mixed
```

지정된 `Async\Completable` `$awaitable`이 완료될 때까지(또는 `$cancellation`이 제공된 경우 트리거될 때까지) 현재 코루틴의 실행을 일시 중단하고 결과를 반환합니다.
`awaitable`이 이미 완료된 경우 결과가 즉시 반환됩니다.

코루틴이 예외와 함께 종료된 경우, 해당 예외가 호출 코드로 전파됩니다.

## 매개변수

**`awaitable`**
`Async\Completable` 인터페이스(`Async\Awaitable` 확장)를 구현하는 객체입니다. 일반적으로 다음과 같습니다:
- `Async\Coroutine` - `spawn()` 호출의 결과
- `Async\TaskGroup` - 태스크 그룹
- `Async\Future` - 미래 값

**`cancellation`**
선택적 `Async\Completable` 객체로, 완료 시 대기가 취소됩니다.

## 반환 값

코루틴이 반환한 값을 반환합니다. 반환 타입은 코루틴에 따라 다릅니다.

## 오류/예외

코루틴이 예외와 함께 종료된 경우, `await()`는 해당 예외를 다시 던집니다.

코루틴이 취소된 경우, `Async\AsyncCancellation`이 던져집니다.

## 예제

### 예제 #1 await()의 기본 사용법

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "Hello, Async!";
});

echo await($coroutine); // Hello, Async!
?>
```

### 예제 #2 순차적 대기

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchUser(int $id): array {
    return json_decode(
        file_get_contents("https://api/users/$id"),
        true
    );
}

function fetchPosts(int $userId): array {
    return json_decode(
        file_get_contents("https://api/posts?user=$userId"),
        true
    );
}

$userCoro = spawn(fetchUser(...), 123);
$user = await($userCoro);

$postsCoro = spawn(fetchPosts(...), $user['id']);
$posts = await($postsCoro);

echo "User: {$user['name']}\n";
echo "Posts: " . count($posts) . "\n";
?>
```

### 예제 #3 예외 처리

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $response = file_get_contents('https://api.com/data');

    if ($response === false) {
        throw new RuntimeException("Failed to fetch data");
    }

    return $response;
});

try {
    $data = await($coroutine);
    echo "Data received\n";
} catch (RuntimeException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### 예제 #4 TaskGroup과 함께 await 사용

```php
<?php
use function Async\spawn;
use function Async\await;
use Async\TaskGroup;

$taskGroup = new TaskGroup();

$taskGroup->spawn(function() {
    return "Result 1";
});

$taskGroup->spawn(function() {
    return "Result 2";
});

$taskGroup->spawn(function() {
    return "Result 3";
});

// 모든 결과의 배열을 가져옵니다
$results = await($taskGroup);
print_r($results); // 결과 배열
?>
```

### 예제 #5 동일한 코루틴에 대한 다중 await

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\timeout(1000);
    return "Done";
});

// 첫 번째 await는 결과를 기다립니다
$result1 = await($coroutine);
echo "$result1\n";

// 이후의 await는 즉시 결과를 반환합니다
$result2 = await($coroutine);
echo "$result2\n";

var_dump($result1 === $result2); // true
?>
```

### 예제 #6 코루틴 내부에서의 await

```php
<?php
use function Async\spawn;
use function Async\await;

spawn(function() {
    echo "Parent coroutine started\n";

    $child = spawn(function() {
        echo "Child coroutine running\n";
        Async\sleep(1000);
        return "Result from child";
    });

    echo "Waiting for child...\n";
    $result = await($child);
    echo "Received: $result\n";
});

echo "Main code continues\n";
?>
```

## 변경 이력

| 버전    | 설명                           |
|---------|-------------------------------|
| 1.0.0   | `await()` 함수가 추가되었습니다 |

## 같이 보기

- [spawn()](/ko/docs/reference/spawn.html) - 코루틴 실행
- [suspend()](/ko/docs/reference/suspend.html) - 실행 일시 중단
