---
layout: tutorial
lang: ko
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /ko/tutors/02-cancellation.html
page_title: "취소"
description: "cancel()의 동작 방식과 협력적 코루틴 취소."
---

# 취소

이전 예제에는 `cancel` 함수를 호출하는 흥미로운 부분이 있었습니다.
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

이 부분을 제거하면 어떻게 될까요? 직접 시도해 보세요.
`$progress` 코루틴은 1초 지연과 함께 무한 루프를 돕니다.
`processUsers`가 끝나면 제어 흐름은 계속 진행됩니다. `$progress` 코루틴은 계속 실행됩니다.
영원히요. 결코 멈추지 않습니다. PHP 프로세스도 결코 멈추지 않습니다(외부에서 강제로 종료하지 않는 한).

`$progress->cancel()`은 `$progress` 코루틴을 멈춥니다. 하지만 어떻게 멈출까요?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

`delay(1000)` 주변의 코드를 바꿔서 무슨 일이 일어나는지 살펴봅시다.
```bash
Async\AsyncCancellation
```

`$progress` 코루틴이 `delay(1000)` 안에서 잠들어 있을 때 `cancel()`이 호출되자, `delay`가 `Async\AsyncCancellation` 예외를 던졌습니다. 흥미롭게도 이 방법은 `sleep(1)`에서는 동작하지 않습니다.
`sleep(1)`은 예외를 던지지 않지만 `delay`는 던지는데, 바로 그 점을 여기서 활용하고 있기 때문입니다.

코드에서 `delay`를 사용하는 것은 사실상 다른 코드가 코루틴의 실행을 중단할 수 있게 하는 계약을 맺는 것이라고 말할 수 있습니다. 이는 서로 다른 모듈 간의 관심사를 다시 한번 분리해 주므로 매우 편리합니다.
1. 코루틴은 언제 자신의 실행이 중단될지 모릅니다.
2. 코루틴을 취소하는 코드는 코루틴이 정확히 어떻게 중단될지 모릅니다.

코루틴은 어떤 마법으로 멈추는 것이 아니라 예외를 통해 멈춥니다.
코루틴은 임의의 작업 도중에는 취소될 수 없고, 오직 스스로 제어권을 양보하기로 선택한 지점에서만 취소될 수 있습니다. 이런 종류의 취소를 "협력적(cooperative)" 취소라고 부릅니다.
