---
layout: docs
lang: uk
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /uk/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Створює нову кореневу область видимості Scope."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Створює нову кореневу область видимості `Scope`. Коренева область не має батьківської області і є незалежною одиницею для керування життєвим циклом корутин.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine in a new scope\n";
});

$scope->awaitCompletion();
```

### Приклад #2 Створення кількох незалежних областей видимості

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Task A\n";
});

$scopeB->spawn(function() {
    echo "Task B\n";
});

// Cancelling one scope does not affect the other
$scopeA->cancel();

// $scopeB continues running
$scopeB->awaitCompletion();
```

## Дивіться також

- [Scope::inherit](/uk/docs/reference/scope/inherit.html) — Створення дочірньої області видимості
- [Scope::spawn](/uk/docs/reference/scope/spawn.html) — Запуск корутини в області видимості
