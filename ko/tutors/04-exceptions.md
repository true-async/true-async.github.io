---
layout: tutorial
lang: ko
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /ko/tutors/04-exceptions.html
page_title: "예외"
description: "코루틴에서 발생한 예외가 await()를 통해 어떻게 전파되는지."
---

# 코루틴에서의 예외

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

이전 장의 `validateToken` 함수에는 몇 가지 문제가 있습니다.
`UserDirectory`가 응답하지 않으면(타임아웃, 네트워크 다운, DNS 미해석) `file_get_contents`는 `false`를 반환합니다.
`json_decode(false)`는 `null`을 반환하고, `null->valid`도 `null`입니다. 함수는 실제로 유효하지 않은 토큰과 동일한 결과인 거짓 같은(falsy) 값을 반환합니다. `validateToken`은 "토큰이 만료되었다"와 "`UserDirectory`가 응답하지 않았다"를 구분할 방법이 없는데, 이 둘은 완전히 다른 상황입니다.

올바른 접근 방식은 서비스가 응답하지 않을 때 예외를 던지는 것입니다.

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

그런데 코루틴 안에서 예외가 던져지면 어떻게 될까요?
일반적인 `PHP` 코드에서 예외가 던져지고 아무도 잡지 않으면 `PHP`는 Unhandled Exception 메시지와 함께 종료됩니다. 코루틴은 어떨까요?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

언뜻 보기에는 차이가 없어 보입니다. 하지만 전혀 그렇지 않습니다.
코루틴은 그들 사이의 전환을 담당하는 `Scheduler` 컴포넌트에 속합니다. 각 코루틴은 자신의 논리적 스레드에서 실행됩니다. 처리되지 않은 예외가 코루틴의 최종 핸들러에 도달하면, 그 예외는 코루틴의 핸들에 저장됩니다.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

다시 말해, 누군가 여전히 `$coroutine`에 대한 참조를 가지고 있는 한 예외는 프로그램을 종료시키지 않습니다. 이 로직은 `await` 작업의 멱등성을 보장합니다.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

같은 코루틴에 대해 `await`를 반복 호출하면, 코루틴이 여전히 실행 중인지 아닌지와 관계없이 동일한 동작을 보입니다. 이 덕분에 코루틴을 `Future`, 즉 미래의 어느 시점에 얻을 수 있는 결과에 대한 약속처럼 다룰 수 있습니다. 결과가 이미 존재한다면 `await`는 그것을 즉시 반환합니다.

이제 예외 처리를 추가하여 토큰을 검증하고 프로필을 업데이트하는 코드를 개선할 수 있습니다.

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // 나중에 작업을 다시 시도해 볼 만할까요?
}
```

> 중요!
> `await` 또는 다른 `await_*` 작업을 호출한 후에는
> 코루틴이 처리된 것으로 표시되며, 그 예외는 더 이상
> PHP 프로그램을 종료시키지 않습니다.
