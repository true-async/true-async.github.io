---
layout: docs
lang: uk
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /uk/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Отримати результат виконання корутини."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Повертає результат виконання корутини. Якщо корутина ще не завершилася, повертає `null`.

**Важливо:** цей метод не очікує завершення корутини. Для очікування використовуйте `await()`.

## Значення, що повертається

`mixed` -- результат корутини або `null`, якщо корутина ще не завершилася.

## Приклади

### Приклад #1 Базове використання

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// До завершення
var_dump($coroutine->getResult()); // NULL

// Очікуємо завершення
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Приклад #2 Перевірка з isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // дозволити корутині завершитися

if ($coroutine->isCompleted()) {
    echo "Result: " . $coroutine->getResult() . "\n";
}
```

## Дивіться також

- [Coroutine::getException](/uk/docs/reference/coroutine/get-exception.html) -- Отримати виняток
- [Coroutine::isCompleted](/uk/docs/reference/coroutine/is-completed.html) -- Перевірка завершення
- [await()](/uk/docs/reference/await.html) -- Очікувати результат
