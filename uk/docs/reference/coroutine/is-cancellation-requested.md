---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-cancellation-requested.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-cancellation-requested.html
page_title: "Coroutine::isCancellationRequested"
description: "Перевірити, чи було запитано скасування корутини."
---

# Coroutine::isCancellationRequested

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancellationRequested(): bool
```

Перевіряє, чи було запитано скасування корутини. На відміну від `isCancelled()`, повертає `true` одразу після виклику `cancel()`, навіть якщо корутина все ще виконується всередині `protect()`.

## Значення, що повертається

`bool` -- `true`, якщо скасування було запитано.

## Приклади

### Приклад #1 Відмінність від isCancelled()

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

// До скасування
var_dump($coroutine->isCancellationRequested()); // bool(false)

$coroutine->cancel();

// Одразу після cancel()
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false) -- ще всередині protect()
```

## Дивіться також

- [Coroutine::isCancelled](/uk/docs/reference/coroutine/is-cancelled.html) -- Перевірка завершеного скасування
- [Coroutine::cancel](/uk/docs/reference/coroutine/cancel.html) -- Скасувати корутину
- [protect()](/uk/docs/reference/protect.html) -- Захищена секція
