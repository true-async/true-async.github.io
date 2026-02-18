---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Проверить, был ли запрошен отмена корутины."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Проверяет, был ли запрошен отмена корутины. В отличие от `isCancelled()`, возвращает `true` сразу после вызова `cancel()`, даже если корутина ещё выполняется внутри `protect()`.

## Возвращаемое значение

`bool` — `true`, если отмена была запрошена.

## Примеры

### Пример #1 Разница с isCancelled()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        suspend();
    });
});

suspend();

// До отмены
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Сразу после cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) — ещё в protect()
```

## См. также

- [Coroutine::isCancelled](/ru/docs/reference/coroutine/is-cancelled.html) — Проверить завершённую отмену
- [Coroutine::cancel](/ru/docs/reference/coroutine/cancel.html) — Отменить корутину
- [protect()](/ru/docs/reference/protect.html) — Защищённая секция
