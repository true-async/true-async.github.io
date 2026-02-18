---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/is-completed.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/is-completed.html
page_title: "Coroutine::isCompleted"
description: "Проверить, завершена ли корутина."
---

# Coroutine::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCompleted(): bool
```

Проверяет, завершила ли корутина своё выполнение. Корутина считается завершённой как при успешном завершении, так и при завершении с ошибкой или отмене.

## Возвращаемое значение

`bool` — `true`, если корутина завершила выполнение.

## Примеры

### Пример #1 Проверка завершения

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

### Пример #2 Неблокирующая проверка готовности

```php
<?php

use function Async\spawn;
use function Async\suspend;

$tasks = [
    spawn(fn() => file_get_contents('https://api1.example.com')),
    spawn(fn() => file_get_contents('https://api2.example.com')),
];

// Ждём пока все завершатся
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

## См. также

- [Coroutine::getResult](/ru/docs/reference/coroutine/get-result.html) — Получить результат
- [Coroutine::getException](/ru/docs/reference/coroutine/get-exception.html) — Получить исключение
- [Coroutine::isCancelled](/ru/docs/reference/coroutine/is-cancelled.html) — Проверить отмену
