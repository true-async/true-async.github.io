---
layout: docs
lang: ru
path_key: "/docs/reference/scope/construct.html"
nav_active: docs
permalink: /ru/docs/reference/scope/construct.html
page_title: "Scope::__construct"
description: "Создаёт новый корневой Scope."
---

# Scope::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct()
```

Создаёт новый корневой `Scope`. Корневой scope не имеет родительского scope и является независимой единицей управления жизненным циклом корутин.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Корутина в новом scope\n";
});

$scope->awaitCompletion();
```

### Пример #2 Создание нескольких независимых scope

```php
<?php

use Async\Scope;

$scopeA = new Scope();
$scopeB = new Scope();

$scopeA->spawn(function() {
    echo "Задача A\n";
});

$scopeB->spawn(function() {
    echo "Задача B\n";
});

// Отмена одного scope не влияет на другой
$scopeA->cancel();

// $scopeB продолжает работать
$scopeB->awaitCompletion();
```

## См. также

- [Scope::inherit](/ru/docs/reference/scope/inherit.html) — Создать дочерний Scope
- [Scope::spawn](/ru/docs/reference/scope/spawn.html) — Запустить корутину в scope
