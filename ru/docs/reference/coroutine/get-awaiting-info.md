---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-awaiting-info.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-awaiting-info.html
page_title: "Coroutine::getAwaitingInfo"
description: "Получить информацию о том, что ожидает корутина."
---

# Coroutine::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getAwaitingInfo(): array
```

Возвращает отладочную информацию о том, что корутина ожидает в данный момент. Полезно для диагностики зависших корутин.

## Возвращаемое значение

`array` — массив с информацией об ожидании. Пустой массив, если информация недоступна.

## Примеры

### Пример #1 Диагностика ожидания

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
        echo "Корутина #{$coro->getId()} ожидает:\n";
        print_r($info);
    }
}
```

## См. также

- [Coroutine::isSuspended](/ru/docs/reference/coroutine/is-suspended.html) — Проверить приостановку
- [Coroutine::getTrace](/ru/docs/reference/coroutine/get-trace.html) — Стек вызовов
- [Coroutine::getSuspendLocation](/ru/docs/reference/coroutine/get-suspend-location.html) — Место приостановки
