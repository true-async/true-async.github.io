---
layout: docs
lang: ru
path_key: "/docs/reference/scope/dispose.html"
nav_active: docs
permalink: /ru/docs/reference/scope/dispose.html
page_title: "Scope::dispose"
description: "Отменяет все корутины и закрывает scope."
---

# Scope::dispose

(PHP 8.6+, True Async 1.0)

```php
public function dispose(): void
```

Принудительно отменяет все корутины scope и закрывает его. После вызова `dispose()` scope помечается как закрытый и отменённый. Новые корутины не могут быть добавлены в закрытый scope.

Это эквивалент последовательного вызова `cancel()` с последующим закрытием scope.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Принудительное закрытие scope

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    try {
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Корутина отменена при dispose\n";
    }
});

// Все корутины будут отменены, scope закрыт
$scope->dispose();

var_dump($scope->isClosed());    // bool(true)
var_dump($scope->isCancelled()); // bool(true)
```

### Пример #2 Очистка в блоке try/finally

```php
<?php

use Async\Scope;

$scope = new Scope();

try {
    $scope->spawn(function() {
        // Рабочая логика
        \Async\delay(5000);
    });

    $scope->awaitCompletion();
} finally {
    $scope->dispose();
}
```

## См. также

- [Scope::disposeSafely](/ru/docs/reference/scope/dispose-safely.html) — Безопасное закрытие (с zombie)
- [Scope::disposeAfterTimeout](/ru/docs/reference/scope/dispose-after-timeout.html) — Закрытие по таймауту
- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отмена без закрытия scope
