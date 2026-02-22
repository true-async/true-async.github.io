---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-cancelled.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-cancelled.html
page_title: "Coroutine::isCancelled"
description: "Перевірити, чи було скасовано корутину."
---

# Coroutine::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isCancelled(): bool
```

Перевіряє, чи було корутину скасовано **та** завершено. Повертає `true` лише тоді, коли скасування повністю завершилося.

Якщо корутина перебуває всередині `protect()`, `isCancelled()` повертатиме `false` до завершення захищеної секції, навіть якщо `cancel()` вже було викликано. Для перевірки запиту на скасування використовуйте `isCancellationRequested()`.

## Значення, що повертається

`bool` -- `true`, якщо корутину було скасовано та завершено.

## Приклади

### Приклад #1 Базове скасування

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    Async\delay(10000);
});

suspend();

$coroutine->cancel();

suspend(); // дозволити завершити скасування

var_dump($coroutine->isCancelled()); // bool(true)
var_dump($coroutine->isCompleted()); // bool(true)
```

### Приклад #2 Відкладене скасування з protect()

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\protect;

$coroutine = spawn(function() {
    protect(function() {
        // Критична секція -- скасування відкладається
        Async\delay(100);
    });
});

suspend();

$coroutine->cancel();

// Скасування запитано, але ще не завершено
var_dump($coroutine->isCancellationRequested()); // bool(true)
var_dump($coroutine->isCancelled());             // bool(false)

suspend(); // дозволити protect() завершитися

var_dump($coroutine->isCancelled());             // bool(true)
```

## Дивіться також

- [Coroutine::isCancellationRequested](/uk/docs/reference/coroutine/is-cancellation-requested.html) -- Перевірка запиту на скасування
- [Coroutine::cancel](/uk/docs/reference/coroutine/cancel.html) -- Скасувати корутину
- [Cancellation](/uk/docs/components/cancellation.html) -- Концепція скасування
