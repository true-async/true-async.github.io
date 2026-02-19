---
layout: docs
lang: ru
path_key: "/docs/reference/scope/dispose-safely.html"
nav_active: docs
permalink: /ru/docs/reference/scope/dispose-safely.html
page_title: "Scope::disposeSafely"
description: "Безопасно закрывает scope — корутины становятся zombie."
---

# Scope::disposeSafely

(PHP 8.6+, True Async 1.0)

```php
public function disposeSafely(): void
```

Безопасно закрывает scope. Активные корутины **не отменяются**, а становятся zombie-корутинами: они продолжают работать, но scope считается закрытым. Zombie-корутины завершатся самостоятельно, когда закончат свою работу.

Если scope помечен как "не безопасный" через `asNotSafely()`, корутины будут отменены вместо превращения в zombie.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(5000);
    echo "Задача завершена как zombie\n";
});

// Scope закрывается, но корутина продолжает работать
$scope->disposeSafely();

var_dump($scope->isClosed()); // bool(true)
// Корутина продолжает выполняться в фоне
```

### Пример #2 Корректное завершение с ожиданием zombie

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Фоновая задача завершена\n";
});

$scope->disposeSafely();

// Ожидаем завершения zombie-корутин
$scope->awaitAfterCancellation(
    errorHandler: function(\Throwable $e) {
        error_log("Ошибка zombie: " . $e->getMessage());
    }
);
```

## См. также

- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Принудительное закрытие scope
- [Scope::asNotSafely](/ru/docs/reference/scope/as-not-safely.html) — Отключить zombie-поведение
- [Scope::awaitAfterCancellation](/ru/docs/reference/scope/await-after-cancellation.html) — Ожидание zombie-корутин
