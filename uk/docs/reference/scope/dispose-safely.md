---
layout: docs
lang: uk
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /uk/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Безпечно закриває область видимості — корутини стають зомбі."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Безпечно закриває область видимості. Активні корутини **не скасовуються**, а натомість стають зомбі-корутинами: вони продовжують виконуватися, але область видимості вважається закритою. Зомбі-корутини завершаться самостійно, коли закінчать свою роботу.

Якщо область видимості позначена як "небезпечна" через `asNotSafely()`, корутини будуть скасовані замість того, щоб стати зомбі.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Task completed as a zombie\n";
});

// Scope is closed, but the coroutine continues running
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Coroutine continues executing in the background
```

### Приклад #2 Коректне завершення з очікуванням зомбі

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Background task completed\n";
});

$scope->disposeSafely();

// Wait for zombie coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

## Дивіться також

- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Примусове закриття області видимості
- [Scope::asNotSafely](/uk/docs/reference/scope/as-not-safely.html) — Вимкнення поведінки зомбі
- [Scope::awaitAfterCancellation](/uk/docs/reference/scope/await-after-cancellation.html) — Очікування зомбі-корутин
