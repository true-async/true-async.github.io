---
layout: docs
lang: ru
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /ru/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Ждёт завершения активных корутин scope."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Ожидает завершения всех **активных** корутин scope. Zombie-корутины не учитываются при ожидании. Параметр `$cancellation` позволяет прервать ожидание досрочно.

## Параметры

`cancellation` — объект `Awaitable`, при срабатывании которого ожидание будет прервано.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Ожидание завершения всех корутин

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Задача 1 завершена\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Задача 2 завершена\n";
});

// Ждём завершения с таймаутом 5 секунд
$scope->awaitCompletion(timeout(5000));
echo "Все задачи выполнены\n";
```

### Пример #2 Прерывание ожидания

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Очень долгая задача
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Ожидание прервано по таймауту\n";
    $scope->cancel();
}
```

## См. также

- [Scope::awaitAfterCancellation](/ru/docs/reference/scope/await-after-cancellation.html) — Ожидание всех корутин включая zombie
- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отмена всех корутин
- [Scope::isFinished](/ru/docs/reference/scope/is-finished.html) — Проверить, завершён ли scope
