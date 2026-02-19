---
layout: docs
lang: ru
path_key: "/docs/reference/future/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/future/cancel.html
page_title: "Future::cancel"
description: "Отменяет Future."
---

# Future::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellation = null): void
```

Отменяет `Future`. Все корутины, ожидающие этот Future через `await()`, получат исключение `CancelledException`. Если указан параметр `$cancellation`, он будет использован как причина отмены.

## Параметры

`cancellation` — пользовательское исключение отмены. Если `null`, используется стандартное `CancelledException`.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Базовая отмена Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Корутина ожидает результат
\Async\async(function() use ($future) {
    try {
        $result = $future->await();
    } catch (\Async\CancelledException $e) {
        echo "Future отменён\n";
    }
});

// Отменяем Future
$future->cancel();
```

### Пример #2 Отмена с пользовательской причиной

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
        echo "Причина: " . $e->getMessage() . "\n";
        // Причина: Превышен таймаут
    }
});

$future->cancel(new AsyncCancellation("Превышен таймаут"));
```

## См. также

- [Future::isCancelled](/ru/docs/reference/future/is-cancelled.html) — Проверить, отменён ли Future
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата
- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибок Future
