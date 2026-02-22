---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "코루틴을 스케줄러의 높은 우선순위로 표시합니다."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

코루틴을 높은 우선순위로 표시합니다. 스케줄러는 다음 실행할 작업을 선택할 때 이러한 코루틴을 우선적으로 처리합니다.

이 메서드는 동일한 코루틴 객체를 반환하여 플루언트 인터페이스를 지원합니다.

## 반환값

`Coroutine` -- 동일한 코루틴 객체 (플루언트 인터페이스).

## 예제

### 예제 #1 우선순위 설정

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### 예제 #2 플루언트 인터페이스

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## 같이 보기

- [spawn()](/ko/docs/reference/spawn.html) -- 코루틴 생성
