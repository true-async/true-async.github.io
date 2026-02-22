---
layout: docs
lang: uk
path_key: "/docs/reference/scope/is-closed.html"
nav_active: docs
permalink: /uk/docs/reference/scope/is-closed.html
page_title: "Scope::isClosed"
description: "Перевіряє, чи закрита область видимості."
---

# Scope::isClosed

(PHP 8.6+, True Async 1.0)

```php
public function isClosed(): bool
```

Перевіряє, чи закрита область видимості. Область видимості вважається закритою після виклику `dispose()` або `disposeSafely()`. Нові корутини не можуть бути додані до закритої області видимості.

## Значення, що повертається

`bool` — `true`, якщо область видимості закрита, `false` — в іншому випадку.

## Приклади

### Приклад #1 Перевірка стану області видимості

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isClosed()); // bool(false)

$scope->dispose();

var_dump($scope->isClosed()); // bool(true)
```

### Приклад #2 Захист від додавання до закритої області видимості

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->dispose();

if (!$scope->isClosed()) {
    $scope->spawn(function() {
        echo "This coroutine will not be created\n";
    });
} else {
    echo "Scope is already closed\n";
}
```

## Дивіться також

- [Scope::isFinished](/uk/docs/reference/scope/is-finished.html) — Перевірка, чи завершена область видимості
- [Scope::isCancelled](/uk/docs/reference/scope/is-cancelled.html) — Перевірка, чи скасована область видимості
- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Закриття області видимості
