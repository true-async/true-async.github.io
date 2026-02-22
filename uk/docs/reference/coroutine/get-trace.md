---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-trace.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-trace.html
page_title: "Coroutine::getTrace"
description: "Отримати стек викликів призупиненої корутини."
---

# Coroutine::getTrace

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getTrace(
    int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT,
    int $limit = 0
): ?array
```

Повертає стек викликів (backtrace) призупиненої корутини. Якщо корутина не призупинена (ще не запущена, зараз виконується або завершилася), повертає `null`.

## Параметри

**options**
: Бітова маска параметрів, аналогічна `debug_backtrace()`:
  - `DEBUG_BACKTRACE_PROVIDE_OBJECT` -- включити `$this` у трасування
  - `DEBUG_BACKTRACE_IGNORE_ARGS` -- не включати аргументи функцій

**limit**
: Максимальна кількість фреймів стеку. `0` -- без обмежень.

## Значення, що повертається

`?array` -- масив фреймів стеку або `null`, якщо корутина не призупинена.

## Приклади

### Приклад #1 Отримання стеку призупиненої корутини

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

suspend(); // дозволити корутині запуститися та призупинитися

$trace = $coroutine->getTrace();

if ($trace !== null) {
    foreach ($trace as $frame) {
        echo ($frame['file'] ?? '?') . ':' . ($frame['line'] ?? '?');
        echo ' ' . ($frame['function'] ?? '') . "\n";
    }
}
```

### Приклад #2 Трасування для завершеної корутини -- null

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(fn() => "test");

// До запуску -- null
var_dump($coroutine->getTrace()); // NULL

await($coroutine);

// Після завершення -- null
var_dump($coroutine->getTrace()); // NULL
```

## Дивіться також

- [Coroutine::isSuspended](/uk/docs/reference/coroutine/is-suspended.html) -- Перевірка призупинення
- [Coroutine::getSuspendLocation](/uk/docs/reference/coroutine/get-suspend-location.html) -- Місце призупинення
- [Coroutine::getSpawnLocation](/uk/docs/reference/coroutine/get-spawn-location.html) -- Місце створення
