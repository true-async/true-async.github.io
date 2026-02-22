---
layout: docs
lang: uk
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /uk/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Скасовує всі корутини та закриває область видимості."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Примусово скасовує всі корутини в області видимості та закриває її. Після виклику `dispose()` область видимості позначається як закрита та скасована. Нові корутини не можуть бути додані до закритої області видимості.

Це еквівалентно виклику `cancel()` з подальшим закриттям області видимості.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Примусове закриття області видимості

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Coroutine cancelled on dispose\n";
    }
});

// All coroutines will be cancelled, scope closed
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Приклад #2 Очищення в блоці try/finally

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Business logic
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## Дивіться також

- [Scope::disposeSafely](/uk/docs/reference/scope/dispose-safely.html) — Безпечне закриття (із зомбі)
- [Scope::disposeAfterTimeout](/uk/docs/reference/scope/dispose-after-timeout.html) — Закриття після тайм-ауту
- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування без закриття області видимості
