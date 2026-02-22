---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Перевірити, чи було корутину запущено планувальником."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Перевіряє, чи було корутину запущено планувальником. Корутина вважається запущеною після того, як планувальник розпочав її виконання.

## Значення, що повертається

`bool` -- `true`, якщо корутину було запущено.

## Приклади

### Приклад #1 Перевірка до та після запуску

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- ще в черзі

suspend(); // дозволити планувальнику запустити корутину

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- все ще true після завершення
```

## Дивіться також

- [Coroutine::isQueued](/uk/docs/reference/coroutine/is-queued.html) -- Перевірка стану черги
- [Coroutine::isRunning](/uk/docs/reference/coroutine/is-running.html) -- Перевірка поточного виконання
- [Coroutine::isCompleted](/uk/docs/reference/coroutine/is-completed.html) -- Перевірка завершення
