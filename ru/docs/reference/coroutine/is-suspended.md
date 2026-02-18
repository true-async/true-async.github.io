---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-suspended.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-suspended.html
page_title: "Coroutine::isSuspended"
description: "Проверить, приостановлена ли корутина."
---

# Coroutine::isSuspended

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isSuspended(): bool
```

Проверяет, приостановлена ли корутина. Корутина приостанавливается при вызове `suspend()`, при I/O операциях или при ожидании `await()`.

## Возвращаемое значение

`bool` — `true`, если корутина приостановлена.

## Примеры

### Пример #1 Проверка приостановки

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

suspend(); // даём корутине запуститься и приостановиться

var_dump($coroutine->isSuspended()); // bool(true)
var_dump($coroutine->isStarted());   // bool(true)
var_dump($coroutine->isCompleted()); // bool(false)
```

## См. также

- [Coroutine::isRunning](/ru/docs/reference/coroutine/is-running.html) — Проверить выполнение
- [Coroutine::getTrace](/ru/docs/reference/coroutine/get-trace.html) — Стек вызовов приостановленной корутины
- [suspend()](/ru/docs/reference/suspend.html) — Приостановить текущую корутину
