---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Отменить выполнение корутины."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Отменяет выполнение корутины. Корутина получит исключение `AsyncCancellation` при следующей точке приостановки (`suspend`, `await`, `delay` и т.д.).

Отмена работает кооперативно — корутина не прерывается мгновенно. Если корутина находится внутри `protect()`, отмена откладывается до завершения защищённой секции.

## Параметры

**cancellation**
: Исключение-причина отмены. Если `null` — создаётся стандартный `AsyncCancellation`.

## Примеры

### Пример #1 Базовая отмена

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    try {
        Async\delay(10000);
    } catch (\Async\AsyncCancellation $e) {
        echo "Отменена: " . $e->getMessage() . "\n";
    }
});

suspend();

$coroutine->cancel();

await($coroutine);
```

### Пример #2 Отмена с причиной

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    Async\delay(10000);
});

$coroutine->cancel(new \Async\AsyncCancellation("Превышен таймаут"));

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo $e->getMessage() . "\n"; // "Превышен таймаут"
}
```

### Пример #3 Отмена до запуска

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// Отменяем до того, как планировщик запустит корутину
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Корутина отменена до запуска\n";
}
```

## См. также

- [Coroutine::isCancelled](/ru/docs/reference/coroutine/is-cancelled.html) — Проверить отмену
- [Coroutine::isCancellationRequested](/ru/docs/reference/coroutine/is-cancellation-requested.html) — Проверить запрос
- [Отмена](/ru/docs/concepts/cancellation.html) — Концепция отмены
- [protect()](/ru/docs/reference/protect.html) — Защищённая секция
