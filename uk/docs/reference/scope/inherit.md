---
layout: docs
lang: uk
path_key: "/docs/reference/scope/inherit.html"
nav_active: docs
permalink: /uk/docs/reference/scope/inherit.html
page_title: "Scope::inherit"
description: "Створює нову область видимості Scope, що успадковується від зазначеної або поточної області."
---

# Scope::inherit

(PHP 8.6+, True Async 1.0)

```php
public static function inherit(?Scope $parentScope = null): Scope
```

Створює нову область видимості `Scope`, що успадковується від зазначеної батьківської області. Якщо параметр `$parentScope` не вказано (або дорівнює `null`), нова область успадковується від поточної активної області видимості.

Дочірня область видимості успадковує обробники винятків та політики скасування від батьківської.

## Параметри

`parentScope` — батьківська область видимості, від якої буде успадковуватися нова область. Якщо `null`, використовується поточна активна область видимості.

## Значення, що повертається

`Scope` — нова дочірня область видимості.

## Приклади

### Приклад #1 Створення дочірньої області від поточної

```php
<?php

use Async\Scope;
use function Async\spawn;

$parentScope = new Scope();

$parentScope->spawn(function() {
    // Inside the coroutine, the current scope is $parentScope
    $childScope = Scope::inherit();

    $childScope->spawn(function() {
        echo "Running in child scope\n";
    });

    $childScope->awaitCompletion();
});
```

### Приклад #2 Явне зазначення батьківської області видимості

```php
<?php

use Async\Scope;

$rootScope = new Scope();
$childScope = Scope::inherit($rootScope);

$childScope->spawn(function() {
    echo "Coroutine in child scope\n";
});

// Cancelling the parent also cancels the child scope
$rootScope->cancel();
```

## Дивіться також

- [Scope::\_\_construct](/uk/docs/reference/scope/construct.html) — Створення кореневої області видимості
- [Scope::getChildScopes](/uk/docs/reference/scope/get-child-scopes.html) — Отримання дочірніх областей видимості
- [Scope::dispose](/uk/docs/reference/scope/dispose.html) — Скасування та закриття області видимості
