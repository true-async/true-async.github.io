---
layout: docs
lang: uk
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /uk/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Очікує завершення всіх корутин, включаючи зомбі, після скасування області видимості."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Очікує завершення **всіх** корутин в області видимості, включаючи зомбі-корутини. Потребує попереднього виклику `cancel()`. Цей метод використовується для коректного завершення області видимості, коли потрібно дочекатися, поки всі корутини (включаючи зомбі) завершать свою роботу.

## Параметри

`errorHandler` — функція зворотного виклику для обробки помилок зомбі-корутин. Приймає `\Throwable` як аргумент. Якщо `null`, помилки ігноруються.

`cancellation` — об'єкт `Awaitable` для переривання очікування. Якщо `null`, очікування не обмежене в часі.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Коректне завершення з обробкою помилок

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task completed\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Background task error");
});

// First, cancel
$scope->cancel();

// Then wait for all coroutines to finish
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Zombie error: " . $e->getMessage());
    }
);
```

### Приклад #2 Очікування з тайм-аутом

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie coroutine that takes a long time to finish
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Resource cleanup
        \Async\delay(2000);
    }
});

$scope->cancel();

$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log($e->getMessage());
    },
    cancellation: timeout(5000)
);
```

## Дивіться також

- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування всіх корутин
- [Scope::awaitCompletion](/uk/docs/reference/scope/await-completion.html) — Очікування активних корутин
- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Скасування та закриття області видимості
