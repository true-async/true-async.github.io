---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-suspend-location.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-suspend-location.html
page_title: "Coroutine::getSuspendLocation"
description: "Получить место приостановки корутины как строку."
---

# Coroutine::getSuspendLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendLocation(): string
```

Возвращает место приостановки корутины в формате `"файл:строка"`. Если информация недоступна, возвращает `"unknown"`.

## Возвращаемое значение

`string` — строка вида `"/app/script.php:42"` или `"unknown"`.

## Примеры

### Пример #1 Диагностика зависшей корутины

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\get_coroutines;

spawn(function() {
    file_get_contents('https://slow-api.example.com'); // зависает здесь
});

suspend();

foreach (get_coroutines() as $coro) {
    if ($coro->isSuspended()) {
        echo "Корутина #{$coro->getId()} ожидает в: {$coro->getSuspendLocation()}\n";
    }
}
```

## См. также

- [Coroutine::getSuspendFileAndLine](/ru/docs/reference/coroutine/get-suspend-file-and-line.html) — Файл и строка как массив
- [Coroutine::getSpawnLocation](/ru/docs/reference/coroutine/get-spawn-location.html) — Место создания
- [Coroutine::getTrace](/ru/docs/reference/coroutine/get-trace.html) — Полный стек вызовов
