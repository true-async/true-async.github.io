---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Проверить, была ли корутина запущена планировщиком."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Проверяет, была ли корутина запущена планировщиком. Корутина считается запущенной после того, как планировщик начал её выполнение.

## Возвращаемое значение

`bool` — `true`, если корутина была запущена.

## Примеры

### Пример #1 Проверка до и после запуска

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) — ещё в очереди

suspend(); // даём планировщику запустить корутину

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) — всё ещё true после завершения
```

## См. также

- [Coroutine::isQueued](/ru/docs/reference/coroutine/is-queued.html) — Проверить очередь
- [Coroutine::isRunning](/ru/docs/reference/coroutine/is-running.html) — Проверить, выполняется ли сейчас
- [Coroutine::isCompleted](/ru/docs/reference/coroutine/is-completed.html) — Проверить завершение
