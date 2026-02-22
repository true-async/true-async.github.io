---
layout: docs
lang: uk
path_key: "/docs/reference/scope/set-child-scope-exception-handler.html"
nav_active: docs
permalink: /uk/docs/reference/scope/set-child-scope-exception-handler.html
page_title: "Scope::setChildScopeExceptionHandler"
description: "Встановлює обробник винятків для дочірніх областей видимості."
---

# Scope::setChildScopeExceptionHandler

(PHP 8.6+, True Async 1.0)

```php
public function setChildScopeExceptionHandler(callable $exceptionHandler): void
```

Встановлює обробник винятків для винятків, що виникають у дочірніх областях видимості. Коли дочірня область завершується з помилкою, викликається цей обробник, запобігаючи поширенню винятку до батьківської області видимості.

## Параметри

`exceptionHandler` — функція обробки винятків для дочірніх областей видимості. Приймає `\Throwable` як аргумент.

## Значення, що повертається

Значення не повертається.

## Приклади

### Приклад #1 Перехоплення помилок дочірніх областей видимості

```php
<?php

use Async\Scope;

$parentScope = new Scope();

$parentScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("Error in child scope: " . $e->getMessage());
});

$childScope = Scope::inherit($parentScope);

$childScope->spawn(function() {
    throw new \RuntimeException("Child scope error");
});

$childScope->awaitCompletion();
// Error handled, does not propagate to $parentScope
```

### Приклад #2 Ізоляція помилок між модулями

```php
<?php

use Async\Scope;

$appScope = new Scope();

$appScope->setChildScopeExceptionHandler(function(\Throwable $e) {
    error_log("[App] Module error: " . $e->getMessage());
});

// Each module in its own scope
$authScope = Scope::inherit($appScope);
$cacheScope = Scope::inherit($appScope);

$authScope->spawn(function() {
    // An error here will not affect $cacheScope
    throw new \RuntimeException("Auth failed");
});

$cacheScope->spawn(function() {
    echo "Cache is working fine\n";
});

$appScope->awaitCompletion();
```

## Дивіться також

- [Scope::setExceptionHandler](/uk/docs/reference/scope/set-exception-handler.html) — Обробник винятків для корутин
- [Scope::inherit](/uk/docs/reference/scope/inherit.html) — Створення дочірньої області видимості
- [Scope::getChildScopes](/uk/docs/reference/scope/get-child-scopes.html) — Отримання дочірніх областей видимості
