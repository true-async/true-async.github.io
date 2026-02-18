---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Проверить, выполняется ли корутина прямо сейчас."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Проверяет, выполняется ли корутина в данный момент. Корутина считается запущенной, если она была начата и ещё не завершилась.

## Возвращаемое значение

`bool` — `true`, если корутина запущена и не завершена.

## Примеры

### Пример #1 Проверка состояния выполнения

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // Внутри корутины isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// Снаружи — корутина приостановлена или ещё не запущена
var_dump($coroutine->isRunning()); // bool(false)
```

## См. также

- [Coroutine::isStarted](/ru/docs/reference/coroutine/is-started.html) — Проверить запуск
- [Coroutine::isSuspended](/ru/docs/reference/coroutine/is-suspended.html) — Проверить приостановку
- [Coroutine::isCompleted](/ru/docs/reference/coroutine/is-completed.html) — Проверить завершение
