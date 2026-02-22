---
layout: docs
lang: uk
path_key: "/docs/reference/scope/is-finished.html"
nav_active: docs
permalink: /uk/docs/reference/scope/is-finished.html
page_title: "Scope::isFinished"
description: "Перевіряє, чи завершена область видимості."
---

# Scope::isFinished

(PHP 8.6+, True Async 1.0)

```php
public function isFinished(): bool
```

Перевіряє, чи завершилися всі корутини в області видимості. Область видимості вважається завершеною, коли всі її корутини (включаючи дочірні області) завершили виконання.

## Значення, що повертається

`bool` — `true`, якщо всі корутини області видимості завершилися, `false` — в іншому випадку.

## Приклади

### Приклад #1 Перевірка завершення області видимості

```php
<?php

use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
});

var_dump($scope->isFinished()); // bool(false)

$scope->awaitCompletion();

var_dump($scope->isFinished()); // bool(true)
```

## Дивіться також

- [Scope::isClosed](/uk/docs/reference/scope/is-closed.html) — Перевірка, чи закрита область видимості
- [Scope::isCancelled](/uk/docs/reference/scope/is-cancelled.html) — Перевірка, чи скасована область видимості
- [Scope::awaitCompletion](/uk/docs/reference/scope/await-completion.html) — Очікування завершення корутин
