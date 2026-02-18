---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-queued.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-queued.html
page_title: "Coroutine::isQueued"
description: "Проверить, находится ли корутина в очереди планировщика."
---

# Coroutine::isQueued

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isQueued(): bool
```

Проверяет, находится ли корутина в очереди планировщика для выполнения.

## Возвращаемое значение

`bool` — `true`, если корутина находится в очереди.

## Примеры

### Пример #1 Состояние очереди

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend();
    return "done";
});

var_dump($coroutine->isQueued()); // bool(true) — ожидает запуска

suspend(); // даём планировщику запустить корутину

// Корутина запущена, но остаётся в очереди после suspend() внутри
var_dump($coroutine->isStarted()); // bool(true)
```

## См. также

- [Coroutine::isStarted](/ru/docs/reference/coroutine/is-started.html) — Проверить запуск
- [Coroutine::isSuspended](/ru/docs/reference/coroutine/is-suspended.html) — Проверить приостановку
