---
layout: docs
lang: ru
path_key: "/docs/reference/scope/dispose-after-timeout.html"
nav_active: docs
permalink: /ru/docs/reference/scope/dispose-after-timeout.html
page_title: "Scope::disposeAfterTimeout"
description: "Закрывает scope через указанный таймаут."
---

# Scope::disposeAfterTimeout

(PHP 8.6+, True Async 1.0)

```php
public function disposeAfterTimeout(int $timeout): void
```

Планирует закрытие scope через указанный таймаут. По истечении таймаута вызывается `dispose()`, отменяющий все корутины и закрывающий scope. Это удобно для установки максимального времени жизни scope.

## Параметры

`timeout` — время в миллисекундах до автоматического закрытия scope.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Ограничение времени выполнения

```php
<?php

use Async\Scope;

$scope = new Scope();

// Scope будет закрыт через 10 секунд
$scope->disposeAfterTimeout(10_000);

$scope->spawn(function() {
    try {
        // Долгая операция
        \Async\delay(60_000);
    } catch (\Async\CancelledException) {
        echo "Задача отменена по таймауту scope\n";
    }
});

$scope->awaitCompletion();
```

### Пример #2 Scope с ограниченным временем жизни

```php
<?php

use Async\Scope;

$scope = new Scope();
$scope->disposeAfterTimeout(5000); // 5 секунд на всю работу

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Задача 1: OK\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Задача 2: OK\n";
});

$scope->spawn(function() {
    \Async\delay(30_000); // Не успеет
    echo "Задача 3: OK\n"; // Не будет выведено
});

$scope->awaitCompletion();
```

## См. также

- [Scope::dispose](/ru/docs/reference/scope/dispose.html) — Немедленное закрытие scope
- [Scope::disposeSafely](/ru/docs/reference/scope/dispose-safely.html) — Безопасное закрытие scope
- [timeout()](/ru/docs/reference/timeout.html) — Глобальная функция таймаута
