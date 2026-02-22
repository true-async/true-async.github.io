---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Отримати місце призупинення корутини у вигляді рядка."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Повертає місце призупинення корутини у форматі `"file:line"`. Якщо інформація недоступна, повертає `"unknown"`.

## Значення, що повертається

`string` -- рядок виду `"/app/script.php:42"` або `"unknown"`.

## Приклади

### Приклад #1 Діагностика завислої корутини

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // зависла тут
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Coroutine #{$coro->getId()} waiting at: {$coro->getSuspendLocation()}\n";
    }
}
```

## Дивіться також

- [Coroutine::getSuspendFileAndLine](/uk/docs/reference/coroutine/get-suspend-file-and-line.html) -- Файл і рядок у вигляді масиву
- [Coroutine::getSpawnLocation](/uk/docs/reference/coroutine/get-spawn-location.html) -- Місце створення
- [Coroutine::getTrace](/uk/docs/reference/coroutine/get-trace.html) -- Повний стек викликів
