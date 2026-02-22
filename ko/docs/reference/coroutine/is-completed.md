---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "코루틴이 완료되었는지 확인합니다."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

코루틴이 실행을 완료했는지 확인합니다. 코루틴은 성공적으로 완료되거나, 오류로 완료되거나, 취소된 경우 완료된 것으로 간주됩니다.

## 반환값

`bool` -- 코루틴이 실행을 완료한 경우 `true`.

## 예제

### 예제 #1 완료 확인

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### 예제 #2 비차단 준비 상태 확인

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// 모두 완료될 때까지 대기
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## 같이 보기

- [Coroutine::getResult](/ko/docs/reference/coroutine/get-result.html) -- 결과 가져오기
- [Coroutine::getException](/ko/docs/reference/coroutine/get-exception.html) -- 예외 가져오기
- [Coroutine::isCancelled](/ko/docs/reference/coroutine/is-cancelled.html) -- 취소 확인
