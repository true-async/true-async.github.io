---
layout: docs
lang: ru
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /ru/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Устанавливает обработчик ошибок из дочерних Scope."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Устанавливает обработчик исключений, возникающих в дочерних scope. Когда дочерний scope завершается с ошибкой, вызывается данный обработчик, предотвращая всплытие исключения в родительский scope.

## Параметры

`exceptionHandler` — функция обработки исключений из дочерних scope. Принимает `\Throwable` как аргумент.

## Возвращаемое значение

Функция не возвращает значения.

## Примеры

### Пример #1 Перехват ошибок дочерних scope

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Ошибка в дочернем scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Ошибка в дочернем scope");
});

$childScope->awaitCompletion();
// Ошибка обработана, не всплывает в $parentScope
```

### Пример #2 Изоляция ошибок между модулями

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Ошибка модуля: " . $e->getMessage());
});

// Каждый модуль в своём scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // Ошибка здесь не затронет $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Кеш работает нормально\n";
});

$appScope->awaitCompletion();
```

## См. также

- [Scope::setExceptionHandler](/ru/docs/reference/scope/set-exception-handler.html) — Обработчик ошибок корутин
- [Scope::inherit](/ru/docs/reference/scope/inherit.html) — Создать дочерний scope
- [Scope::getChildScopes](/ru/docs/reference/scope/get-child-scopes.html) — Получить дочерние scope
