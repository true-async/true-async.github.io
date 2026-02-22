---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Отримати інформацію про те, на що очікує корутина."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Повертає налагоджувальну інформацію про те, на що корутина наразі очікує. Корисно для діагностики завислих корутин.

## Значення, що повертається

`array` -- масив з інформацією про очікування. Порожній масив, якщо інформація недоступна.

## Приклади

### Приклад #1 Діагностика стану очікування

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    Async\delay(5000);
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        $info = $coro->getAwaitingInfo();
        echo "Coroutine #{$coro->getId()} is awaiting:\n";
        print_r($info);
    }
}
```

## Дивіться також

- [Coroutine::isSuspended](/uk/docs/reference/coroutine/is-suspended.html) -- Перевірка призупинення
- [Coroutine::getTrace](/uk/docs/reference/coroutine/get-trace.html) -- Стек викликів
- [Coroutine::getSuspendLocation](/uk/docs/reference/coroutine/get-suspend-location.html) -- Місце призупинення
