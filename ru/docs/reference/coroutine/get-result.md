---
layout: docs
lang: ru
path_key: "/docs/reference/coroutine/get-result.html"
nav_active: docs
permalink: /ru/docs/reference/coroutine/get-result.html
page_title: "Coroutine::getResult"
description: "Получить результат выполнения корутины."
---

# Coroutine::getResult

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getResult(): mixed
```

Возвращает результат выполнения корутины. Если корутина ещё не завершилась, возвращает `null`.

**Важно:** этот метод не ожидает завершения корутины. Для ожидания используйте `await()`.

## Возвращаемое значение

`mixed` — результат корутины или `null`, если корутина ещё не завершилась.

## Примеры

### Пример #1 Базовое использование

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    return "test result";
});

// До завершения
var_dump($coroutine->getResult()); // NULL

// Ждём завершения
await($coroutine);

var_dump($coroutine->getResult()); // string(11) "test result"
```

### Пример #2 Проверка с isCompleted()

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(fn() => 42);

suspend(); // даём корутине завершиться

if ($coroutine->isCompleted()) {
    echo "Результат: " . $coroutine->getResult() . "\n";
}
```

## См. также

- [Coroutine::getException](/ru/docs/reference/coroutine/get-exception.html) — Получить исключение
- [Coroutine::isCompleted](/ru/docs/reference/coroutine/is-completed.html) — Проверить завершение
- [await()](/ru/docs/reference/await.html) — Дождаться результата
