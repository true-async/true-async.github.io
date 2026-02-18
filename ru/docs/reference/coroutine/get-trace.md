---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Получить стек вызовов приостановленной корутины."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Возвращает стек вызовов (backtrace) приостановленной корутины. Если корутина не приостановлена (ещё не запущена, выполняется или завершена), возвращает `null`.

## Параметры

**options**
: Битовая маска опций, аналогичная `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` — включать `$this` в trace
  - `DEBUG_BACKTRACE_IGNORE_ARGS` — не включать аргументы функций

**limit**
: Максимальное количество фреймов стека. `0` — без ограничений.

## Возвращаемое значение

`?array` — массив фреймов стека или `null`, если корутина не приостановлена.

## Примеры

### Пример #1 Получение стека приостановленной корутины

```php
<?php

use function Async\spawn;
use function Async\suspend;

function innerFunction() {
    suspend();
}

function outerFunction() {
    innerFunction();
}

$coroutine = spawn(function() {
    outerFunction();
});

suspend(); // даём корутине запуститься и приостановиться

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Пример #2 Trace для завершённой корутины — null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// До запуска — null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// После завершения — null
var_dump($coroutine->getTrace()); // NULL
```

## См. также

- [Coroutine::isSuspended](/ru/docs/reference/coroutine/is-suspended.html) — Проверить приостановку
- [Coroutine::getSuspendLocation](/ru/docs/reference/coroutine/get-suspend-location.html) — Место приостановки
- [Coroutine::getSpawnLocation](/ru/docs/reference/coroutine/get-spawn-location.html) — Место создания
