---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "코루틴 실행을 취소합니다."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

코루틴 실행을 취소합니다. 코루틴은 다음 일시 중단 지점(`suspend`, `await`, `delay` 등)에서 `AsyncCancellation` 예외를 받게 됩니다.

취소는 협력적으로 동작합니다 -- 코루틴이 즉시 중단되지 않습니다. 코루틴이 `protect()` 내부에 있는 경우, 보호 구간이 완료될 때까지 취소가 지연됩니다.

## 매개변수

**cancellation**
: 취소 사유를 나타내는 예외입니다. `null`인 경우 기본 `AsyncCancellation`이 생성됩니다.

## 예제

### 예제 #1 기본 취소

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Cancelled: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### 예제 #2 사유를 포함한 취소

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Timeout exceeded"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Timeout exceeded"
}
```

### 예제 #3 시작 전 취소

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// 스케줄러가 코루틴을 시작하기 전에 취소
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## 같이 보기

- [Coroutine::isCancelled](/ko/docs/reference/coroutine/is-cancelled.html) -- 취소 확인
- [Coroutine::isCancellationRequested](/ko/docs/reference/coroutine/is-cancellation-requested.html) -- 취소 요청 확인
- [Cancellation](/ko/docs/components/cancellation.html) -- 취소 개념
- [protect()](/ko/docs/reference/protect.html) -- 보호 구간
