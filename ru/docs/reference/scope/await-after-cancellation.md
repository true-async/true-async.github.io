---
layout: docs
lang: ru
path_key: "/docs/reference/scope/await-after-cancellation.html"
nav_active: docs
permalink: /ru/docs/reference/scope/await-after-cancellation.html
page_title: "Scope::awaitAfterCancellation"
description: "Ждёт завершения всех корутин включая zombie после отмены scope."
---

# Scope::awaitAfterCancellation

(PHP 8.6+, True Async 1.0)

```php
public function awaitAfterCancellation(
    ?callable $errorHandler = null,
    ?Awaitable $cancellation = null
): void
```

Ожидает завершения **всех** корутин scope, включая zombie-корутины. Требует предварительного вызова `cancel()`. Этот метод используется для корректного завершения scope, когда необходимо дождаться, пока все корутины (в том числе zombie) завершат свою работу.

## Параметры

`errorHandler` — функция обратного вызова для обработки ошибок zombie-корутин. Принимает `\Throwable` как аргумент. Если `null`, ошибки игнорируются.

`cancellation` — объект `Awaitable` для прерывания ожидания. Если `null`, ожидание не ограничено по времени.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Корректное завершение с обработкой ошибок

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Задача завершена\n";
});

$scope->spawn(function() {
    \Async\delay(5000);
    throw new \RuntimeException("Ошибка фоновой задачи");
});

// Сначала отменяем
$scope->cancel();

// Затем ждём завершения всех корутин
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Ошибка zombie: " . $e->getMessage());
    }
);
```

### Пример #2 Ожидание с таймаутом

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    // Zombie-корутина, которая долго завершается
    try {
        \Async\delay(30_000);
    } catch (\Async\CancelledException) {
        // Очистка ресурсов
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

## См. также

- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отмена всех корутин
- [Scope::awaitCompletion](/ru/docs/reference/scope/await-completion.html) — Ожидание активных корутин
- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Отменить и закрыть scope
