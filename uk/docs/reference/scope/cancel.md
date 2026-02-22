---
layout: docs
lang: uk
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /uk/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Скасовує всі корутини в області видимості."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Скасовує всі корутини, що належать даній області видимості. Кожна активна корутина отримає `CancelledException`. Якщо вказано `$cancellationError`, він буде використаний як причина скасування.

## Параметри

`cancellationError` — користувацький виняток скасування. Якщо `null`, використовується стандартний `CancelledException`.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Базове скасування

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Long operation
    } catch (\Async\CancelledException $e) {
        echo "Coroutine cancelled\n";
    }
});

// Cancel all coroutines
$scope->cancel();
```

### Приклад #2 Скасування з користувацькою помилкою

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Reason: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Timeout exceeded");
$scope->cancel($error);
```

## Дивіться також

- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Скасування та закриття області видимості
- [Scope::isCancelled](/uk/docs/reference/scope/is-cancelled.html) — Перевірка, чи скасована область видимості
- [Scope::awaitAfterCancellation](/uk/docs/reference/scope/await-after-cancellation.html) — Очікування після скасування
