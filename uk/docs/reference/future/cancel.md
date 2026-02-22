---
layout: docs
lang: uk
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /uk/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Скасування Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Скасовує `Future`. Усі корутини, що очікують цей Future через `await()`, отримають `CancelledException`. Якщо передано параметр `$cancellation`, він буде використаний як причина скасування.

## Параметри

`cancellation` — користувацький виняток скасування. Якщо `null`, використовується стандартний `CancelledException`.

## Значення, що повертається

Функція не повертає значення.

## Приклади

### Приклад #1 Базове скасування Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Корутина, що очікує результат
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future cancelled\n";
    }
});

// Скасування Future
$future->cancel();
```

### Приклад #2 Скасування з довільною причиною

```php
<?php

use Async\Future;
use Async\FutureState;
use Async\AsyncCancellation;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($future) {
    try {
        $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
        // Reason: Timeout exceeded
    }
});

$future->cancel(new AsyncCancellation("Timeout exceeded"));
```

## Дивіться також

- [Future::isCancelled](/uk/docs/reference/future/is-cancelled.html) — Перевірити, чи скасовано Future
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат
- [Future::catch](/uk/docs/reference/future/catch.html) — Обробити помилки Future
