---
layout: docs
lang: ru
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /ru/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Устанавливает обработчик ошибок из дочерних корутин."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Устанавливает обработчик исключений, возникающих в дочерних корутинах scope. Когда корутина завершается с необработанным исключением, вместо всплытия ошибки вызывается указанный обработчик.

## Параметры

`exceptionHandler` — функция обработки исключений. Принимает `\Throwable` как аргумент.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Обработка ошибок корутин

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Ошибка в корутине: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Что-то пошло не так");
});

$scope->awaitCompletion();
// В лог будет записано: "Ошибка в корутине: Что-то пошло не так"
```

### Пример #2 Централизованное логирование ошибок

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Ошибка 1");
});

$scope->spawn(function() {
    throw new \LogicException("Ошибка 2");
});

$scope->awaitCompletion();

echo "Всего ошибок: " . count($errors) . "\n"; // Всего ошибок: 2
```

## См. также

- [Scope::setChildScopeExceptionHandler](/ru/docs/reference/scope/set-child-scope-exception-handler.html) — Обработчик ошибок дочерних scope
- [Scope::finally](/ru/docs/reference/scope/on-finally.html) — Колбэк при завершении scope
