---
layout: docs
lang: ru
path_key: "/docs/reference/scope/cancel.html"
nav_active: docs
permalink: /ru/docs/reference/scope/cancel.html
page_title: "Scope::cancel"
description: "Отменяет все корутины scope."
---

# Scope::cancel

(PHP 8.6+, True Async 1.0)

```php
public function cancel(?AsyncCancellation $cancellationError = null): void
```

Отменяет все корутины, принадлежащие данному scope. Каждая активная корутина получит исключение `CancelledException`. Если указан `$cancellationError`, он будет использован как причина отмены.

## Параметры

`cancellationError` — пользовательское исключение отмены. Если `null`, используется стандартное `CancelledException`.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Базовая отмена

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000); // Долгая операция
    } catch (\Async\CancelledException $e) {
        echo "Корутина отменена\n";
    }
});

// Отменяем все корутины
$scope->cancel();
```

### Пример #2 Отмена с пользовательской ошибкой

```php
<?php

use Async\Scope;
use Async\AsyncCancellation;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException $e) {
        echo "Причина: " . $e->getMessage() . "\n";
    }
});

$error = new AsyncCancellation("Таймаут превышен");
$scope->cancel($error);
```

## См. также

- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Отменить и закрыть scope
- [Scope::isCancelled](/ru/docs/reference/scope/is-cancelled.html) — Проверить, отменён ли scope
- [Scope::awaitAfterCancellation](/ru/docs/reference/scope/await-after-cancellation.html) — Ожидание после отмены
