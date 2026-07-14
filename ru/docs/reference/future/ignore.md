---
layout: docs
lang: ru
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /ru/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Не пробрасывать необработанные ошибки в event loop handler."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Помечает `Future` как игнорируемый. Если Future завершится с ошибкой и она не будет обработана, ошибка не будет передана в обработчик необработанных исключений event loop. Полезно для "fire-and-forget" задач, где результат не важен.

## Возвращаемое значение

`Future` — возвращает тот же Future для цепочки вызовов.

## Примеры

### Пример #1 Игнорирование ошибок Future

```php
<?php

use Async\Future;
use Async\FutureState;

// Запускаем задачу, ошибки которой нас не интересуют
$state  = new FutureState();
$future = new Future($state);
$future->ignore();

\Async\spawn(function() use ($state) {
    // Эта операция может завершиться с ошибкой
    try {
        sendAnalytics(['event' => 'page_view']);
        $state->complete(null);
    } catch (\Throwable $e) {
        $state->error($e);
    }
});

// Ошибка не будет передана в event loop handler
```

### Пример #2 Использование ignore с цепочкой методов

```php
<?php

use Async\Future;
use Async\FutureState;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        $state = new FutureState();
        (new Future($state))->ignore();  // Ошибки кэширования не критичны

        \Async\spawn(function() use ($state, $key) {
            try {
                $data = loadFromDatabase($key);
                saveToCache($key, $data);
                $state->complete(null);
            } catch (\Throwable $e) {
                $state->error($e);
            }
        });
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## См. также

- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибки Future
- [Future::finally](/ru/docs/reference/future/finally.html) — Callback при завершении Future
