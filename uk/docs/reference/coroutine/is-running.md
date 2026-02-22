---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-running.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-running.html
page_title: "Coroutine::isRunning"
description: "Перевірити, чи виконується корутина в даний момент."
---

# Coroutine::isRunning

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isRunning(): bool
```

Перевіряє, чи виконується корутина в даний момент. Корутина вважається такою, що виконується, якщо вона була запущена і ще не завершилася.

## Значення, що повертається

`bool` -- `true`, якщо корутина виконується і не завершена.

## Приклади

### Приклад #1 Перевірка стану виконання

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    // Всередині корутини isRunning() == true
    var_dump(\Async\current_coroutine()->isRunning()); // bool(true)
    return "done";
});

// Ззовні -- корутина призупинена або ще не запущена
var_dump($coroutine->isRunning()); // bool(false)
```

## Дивіться також

- [Coroutine::isStarted](/uk/docs/reference/coroutine/is-started.html) -- Перевірка запуску
- [Coroutine::isSuspended](/uk/docs/reference/coroutine/is-suspended.html) -- Перевірка призупинення
- [Coroutine::isCompleted](/uk/docs/reference/coroutine/is-completed.html) -- Перевірка завершення
