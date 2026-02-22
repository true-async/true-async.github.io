---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Перевірити, чи перебуває корутина в черзі планувальника."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Перевіряє, чи перебуває корутина в черзі планувальника на виконання.

## Значення, що повертається

`bool` -- `true`, якщо корутина перебуває в черзі.

## Приклади

### Приклад #1 Стан черги

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) -- очікує запуску

suspend(); // дозволити планувальнику запустити корутину

// Корутина запущена, але залишається в черзі після внутрішнього suspend()
var_dump($coroutine->isStarted()); // bool(true)
```

## Дивіться також

- [Coroutine::isStarted](/uk/docs/reference/coroutine/is-started.html) -- Перевірка запуску
- [Coroutine::isSuspended](/uk/docs/reference/coroutine/is-suspended.html) -- Перевірка призупинення
