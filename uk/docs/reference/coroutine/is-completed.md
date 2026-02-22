---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Перевірити, чи завершилася корутина."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Перевіряє, чи завершила корутина своє виконання. Корутина вважається завершеною при успішному завершенні, завершенні з помилкою або скасуванні.

## Значення, що повертається

`bool` -- `true`, якщо корутина завершила виконання.

## Приклади

### Приклад #1 Перевірка завершення

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isCompleted()); // bool(false)

await($coroutine);

var_dump($coroutine->isCompleted()); // bool(true)
```

### Приклад #2 Неблокуюча перевірка готовності

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Очікуємо завершення всіх
while (true) {
    $allDone = true;
    foreach ($tasks as $task) {
        if (!$task->isCompleted()) {
            $allDone = false;
            break;
        }
    }
    if ($allDone) break;
    suspend();
}
```

## Дивіться також

- [Coroutine::getResult](/uk/docs/reference/coroutine/get-result.html) -- Отримати результат
- [Coroutine::getException](/uk/docs/reference/coroutine/get-exception.html) -- Отримати виняток
- [Coroutine::isCancelled](/uk/docs/reference/coroutine/is-cancelled.html) -- Перевірка скасування
