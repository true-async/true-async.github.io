---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/cancel.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/cancel.html
page_title: "Coroutine::cancel"
description: "Скасувати виконання корутини."
---

# Coroutine::cancel

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::cancel(?Async\AsyncCancellation $cancellation = null): void
```

Скасовує виконання корутини. Корутина отримає виняток `AsyncCancellation` у наступній точці призупинення (`suspend`, `await`, `delay` тощо).

Скасування працює кооперативно -- корутина не переривається миттєво. Якщо корутина перебуває всередині `protect()`, скасування відкладається до завершення захищеної секції.

## Параметри

**cancellation**
: Виняток, що є причиною скасування. Якщо `null`, створюється стандартний `AsyncCancellation`.

## Приклади

### Приклад #1 Базове скасування

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

### Приклад #2 Скасування з причиною

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

### Приклад #3 Скасування до запуску

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "should not complete";
});

// Скасувати до того, як планувальник запустить корутину
$coroutine->cancel();

try {
    await($coroutine);
} catch (\Async\AsyncCancellation $e) {
    echo "Coroutine cancelled before start\n";
}
```

## Дивіться також

- [Coroutine::isCancelled](/uk/docs/reference/coroutine/is-cancelled.html) -- Перевірка скасування
- [Coroutine::isCancellationRequested](/uk/docs/reference/coroutine/is-cancellation-requested.html) -- Перевірка запиту на скасування
- [Cancellation](/uk/docs/components/cancellation.html) -- Концепція скасування
- [protect()](/uk/docs/reference/protect.html) -- Захищена секція
