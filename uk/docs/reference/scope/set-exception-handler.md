---
layout: docs
lang: uk
path_key: "/docs/reference/scope/set-exception-handler.html"
nav_active: docs
permalink: /uk/docs/reference/scope/set-exception-handler.html
page_title: "Scope::setExceptionHandler"
description: "Встановлює обробник винятків для дочірніх корутин."
---

# Scope::setExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setExceptionHandler(callable $exceptionHandler): void
```

Встановлює обробник винятків для винятків, що виникають у дочірніх корутинах області видимості. Коли корутина завершується з необробленим винятком, замість поширення помилки вгору викликається зазначений обробник.

## Параметри

`exceptionHandler` — функція обробки винятків. Приймає `\Throwable` як аргумент.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Обробка помилок корутин

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->setExceptionHandler(function(\Throwable $e) {
    error_log("Coroutine error: " . $e->getMessage());
});

$scope->spawn(function() {
    throw new \RuntimeException("Something went wrong");
});

$scope->awaitCompletion();
// Log will contain: "Coroutine error: Something went wrong"
```

### Приклад #2 Централізоване логування помилок

```php
<?php

use Async\Scope;

$scope = new Scope();
$errors = [];

$scope->setExceptionHandler(function(\Throwable $e) use (&$errors) {
    $errors[] = $e;
});

$scope->spawn(function() {
    throw new \RuntimeException("Error 1");
});

$scope->spawn(function() {
    throw new \LogicException("Error 2");
});

$scope->awaitCompletion();

echo "Total errors: " . count($errors) . "\n"; // Total errors: 2
```

## Дивіться також

- [Scope::setChildScopeExceptionHandler](/uk/docs/reference/scope/set-child-scope-exception-handler.html) — Обробник винятків для дочірніх областей видимості
- [Scope::finally](/uk/docs/reference/scope/on-finally.html) — Зворотний виклик при завершенні області видимості
