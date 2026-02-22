---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-spawn-location.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-spawn-location.html
page_title: "Coroutine::getSpawnLocation"
description: "Отримати місце створення корутини у вигляді рядка."
---

# Coroutine::getSpawnLocation

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnLocation(): string
```

Повертає місце створення корутини у форматі `"file:line"`. Якщо інформація недоступна, повертає `"unknown"`.

## Значення, що повертається

`string` -- рядок виду `"/app/script.php:42"` або `"unknown"`.

## Приклади

### Приклад #1 Налагоджувальний вивід

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test");

echo "Created at: " . $coroutine->getSpawnLocation() . "\n";
// Output: "Created at: /app/script.php:5"
```

### Приклад #2 Логування всіх корутин

```php
<?php

use function Async\spawn;
use function Async\get_coroutines;

spawn(fn() => Async\delay(1000));
spawn(fn() => Async\delay(2000));

foreach (get_coroutines() as $coro) {
    echo "Coroutine #{$coro->getId()} created at {$coro->getSpawnLocation()}\n";
}
```

## Дивіться також

- [Coroutine::getSpawnFileAndLine](/uk/docs/reference/coroutine/get-spawn-file-and-line.html) -- Файл і рядок у вигляді масиву
- [Coroutine::getSuspendLocation](/uk/docs/reference/coroutine/get-suspend-location.html) -- Місце призупинення
- [get_coroutines()](/uk/docs/reference/get-coroutines.html) -- Усі активні корутини
