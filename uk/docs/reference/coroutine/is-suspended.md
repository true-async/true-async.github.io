---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Перевірити, чи призупинено корутину."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Перевіряє, чи призупинено корутину. Корутина стає призупиненою при виклику `suspend()`, під час операцій введення/виведення або під час очікування з `await()`.

## Значення, що повертається

`bool` -- `true`, якщо корутину призупинено.

## Приклади

### Приклад #1 Перевірка призупинення

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // дозволити корутині запуститися та призупинитися

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## Дивіться також

- [Coroutine::isRunning](/uk/docs/reference/coroutine/is-running.html) -- Перевірка виконання
- [Coroutine::getTrace](/uk/docs/reference/coroutine/get-trace.html) -- Стек викликів призупиненої корутини
- [suspend()](/uk/docs/reference/suspend.html) -- Призупинити поточну корутину
