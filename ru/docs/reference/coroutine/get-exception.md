---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-exception.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-exception.html
page_title: "Coroutine::getException"
description: "Получить исключение, возникшее в корутине."
---

# Coroutine::getException

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getException(): mixed
```

Возвращает исключение, которое произошло в корутине. Если корутина завершилась успешно или ещё не завершилась, возвращает `null`. Если корутина была отменена, возвращает объект `AsyncCancellation`.

## Возвращаемое значение

`mixed` — исключение или `null`.

- `null` — если корутина не завершилась или завершилась успешно
- `Throwable` — если корутина завершилась с ошибкой
- `AsyncCancellation` — если корутина была отменена

## Ошибки

Бросает `RuntimeException`, если корутина в данный момент выполняется (running).

## Примеры

### Пример #1 Успешное завершение

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

### Пример #2 Завершение с ошибкой

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
    // Поймали при await
}

$exception = $coroutine->getException();
var_dump($exception instanceof RuntimeException); // bool(true)
var_dump($exception->getMessage());                // string(10) "test error"
```

### Пример #3 Отменённая корутина

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

## См. также

- [Coroutine::getResult](/ru/docs/reference/coroutine/get-result.html) — Получить результат
- [Coroutine::isCancelled](/ru/docs/reference/coroutine/is-cancelled.html) — Проверить отмену
- [Исключения](/ru/docs/concepts/exceptions.html) — Обработка ошибок
