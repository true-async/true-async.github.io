---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Отримати виняток, що виник у корутині."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Повертає виняток, що виник у корутині. Якщо корутина завершилася успішно або ще не завершилася, повертає `null`. Якщо корутину було скасовано, повертає об'єкт `AsyncCancellation`.

## Значення, що повертається

`mixed` -- виняток або `null`.

- `null` -- якщо корутина ще не завершилася або завершилася успішно
- `Throwable` -- якщо корутина завершилася з помилкою
- `AsyncCancellation` -- якщо корутину було скасовано

## Помилки

Викидає `RuntimeException`, якщо корутина наразі виконується.

## Приклади

### Приклад #1 Успішне завершення

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "success";
});

await($coroutine);
var_dump($coroutine->getException()); // NULL
```

### Приклад #2 Завершення з помилкою

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    throw new RuntimeException("test error");
});

try {
    await($coroutine);
} catch (RuntimeException $e) {
    // Перехоплено під час await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### Приклад #3 Скасована корутина

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();
$coroutine->cancel();
suspend();

$exception = $coroutine->getException();
var_dump($exception instanceof \Async\AsyncCancellation); // bool(true)
```

## Дивіться також

- [Coroutine::getResult](/uk/docs/reference/coroutine/get-result.html) -- Отримати результат
- [Coroutine::isCancelled](/uk/docs/reference/coroutine/is-cancelled.html) -- Перевірка скасування
- [Exceptions](/uk/docs/components/exceptions.html) -- Обробка помилок
