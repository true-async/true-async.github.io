---
layout: tutorial
lang: ko
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /ko/tutors/05-timeout.html
page_title: "타임아웃"
description: "timeout()을 사용하여 await()가 기다리는 시간을 제한하기."
---

# await가 기다리는 시간 제한하기

작업이 주어진 시간보다 오래 걸리지 않는다는 보장이 필요한 경우가 많습니다.
예를 들어 `UserDirectory`가 너무 오랫동안 응답하지 않으면 `API`가 고장 난 것처럼 느껴질 수 있습니다.
여기에는 두 가지 가능한 해법이 있습니다.
1. `file_get_contents` 작업 수준에서 타임아웃을 설정하고 함수의 코드를 변경합니다.
2. `await`에 직접 제한을 추가합니다.

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

`await`를 제한하면 좋은 점은 `validateToken`의 코드를 변경할 필요가 없다는 것입니다. 동시에, 예상할 법한 `catch (TimeoutException $e)`가 아니라 `catch (OperationCanceledException $e)`라는 점에 주목하세요.

## OperationCanceledException

`timeout()`은 그 자체로는 아무것도 던지지 않습니다. **취소 토큰**인 `Async\Timeout` 객체를 반환할 뿐입니다.
아래 코드는 스크립트가 아무리 오래 돌아도 결코 예외를 던지지 않습니다:

```php
use function Async\timeout;

$token = timeout(2000);   // just an object; nothing happens
```

The token only takes effect once it is handed to an operation as a cancellation argument:

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // TimeoutException의 메시지
}
```

토큰이 작동하면 `TimeoutException`이 아니라 `OperationCanceledException`이 옵니다. 타임아웃 자체는 그 안의 `getPrevious()`에 들어 있습니다. 이는 의도된 것으로, `await`에 대한 `try-catch` 처리 로직을 단순화하고 취소된 대기와 코루틴 내부에서 발생한 예외를 명확히 구분하기 위한 것입니다.
코루틴은 일반적으로 스스로 `OperationCanceledException`을 던지면 안 됩니다.

`await` 대기를 제한하는 데 사용하는 것이 반드시 `timeout()`일 필요는 없습니다. 다른 어떤 코루틴이 될 수도 있고, 임의의 작업 완료를 나타내는 논리적 계약인 `Future`가 될 수도 있습니다.
