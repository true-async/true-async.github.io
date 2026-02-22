---
layout: docs
lang: uk
path_key: "/docs/reference/scope/is-cancelled.html"
nav_active: docs
permalink: /uk/docs/reference/scope/is-cancelled.html
page_title: "Scope::isCancelled"
description: "Перевіряє, чи скасована область видимості."
---

# Scope::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Перевіряє, чи була скасована область видимості. Область видимості позначається як скасована після виклику `cancel()` або `dispose()`.

## Значення, що повертається

`bool` — `true`, якщо область видимості була скасована, `false` — в іншому випадку.

## Приклади

### Приклад #1 Перевірка скасування області видимості

```php
<?php

use Async\Scope;

$scope = new Scope();

var_dump($scope->isCancelled()); // bool(false)

$scope->cancel();

var_dump($scope->isCancelled()); // bool(true)
```

## Дивіться також

- [Scope::cancel](/uk/docs/reference/scope/cancel.html) — Скасування області видимості
- [Scope::isFinished](/uk/docs/reference/scope/is-finished.html) — Перевірка, чи завершена область видимості
- [Scope::isClosed](/uk/docs/reference/scope/is-closed.html) — Перевірка, чи закрита область видимості
