---
layout: docs
lang: ru
path_key: "/docs/reference/scope/spawn.html"
nav_active: docs
permalink: /ru/docs/reference/scope/spawn.html
page_title: "Scope::spawn"
description: "Запускает корутину в данном scope."
---

# Scope::spawn

(PHP 8.6+, True Async 1.0)

```php
public function spawn(\Closure $callable, mixed ...$params): Coroutine
```

Запускает новую корутину в рамках данного scope. Корутина будет привязана к scope и будет управляться его жизненным циклом: при отмене или закрытии scope все его корутины также будут затронуты.

## Параметры

`callable` — замыкание, которое будет выполнено как корутина.

`params` — аргументы, передаваемые в замыкание.

## Возвращаемое значение

`Coroutine` — объект запущенной корутины.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function() {
    echo "Привет из корутины!\n";
    return 42;
});

echo $coroutine->getResult(); // 42
```

### Пример #2 Передача параметров

```php
<?php

use Async\Scope;

$scope = new Scope();

$coroutine = $scope->spawn(function(string $url, int $timeout) {
    echo "Загрузка $url с таймаутом {$timeout}мс\n";
    // ... выполнение запроса
}, 'https://example.com', 5000);

$scope->awaitCompletion();
```

## См. также

- [spawn()](/ru/docs/reference/spawn.html) — Глобальная функция запуска корутины
- [Scope::cancel](/ru/docs/reference/scope/cancel.html) — Отмена всех корутин scope
- [Scope::awaitCompletion](/ru/docs/reference/scope/await-completion.html) — Ожидание завершения корутин
