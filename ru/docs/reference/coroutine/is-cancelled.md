---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Проверить, была ли корутина отменена."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Проверяет, была ли корутина отменена **и** завершена. Возвращает `true` только когда отмена завершилась полностью.

Если корутина находится внутри `protect()`, `isCancelled()` вернёт `false` до тех пор, пока защищённая секция не завершится, даже если `cancel()` уже был вызван. Для проверки запроса на отмену используйте `isCancellationRequested()`.

## Возвращаемое значение

`bool` — `true`, если корутина была отменена и завершилась.

## Примеры

### Пример #1 Базовая отмена

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // даём отмене завершиться

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Пример #2 Отложенная отмена с protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Критическая секция — отмена отложена
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Отмена запрошена, но ещё не завершена
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // даём protect() завершиться

var_dump($coroutine->isCancelled());             // bool(true)
```

## См. также

- [Coroutine::isCancellationRequested](/ru/docs/reference/coroutine/is-cancellation-requested.html) — Проверить запрос на отмену
- [Coroutine::cancel](/ru/docs/reference/coroutine/cancel.html) — Отменить корутину
- [Отмена](/ru/docs/concepts/cancellation.html) — Концепция отмены
