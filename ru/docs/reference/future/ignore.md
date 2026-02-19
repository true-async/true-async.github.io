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

// Запускаем задачу, ошибки которой нас не интересуют
\Async\async(function() {
    // Эта операция может завершиться с ошибкой
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// Ошибка не будет передана в event loop handler
```

### Пример #2 Использование ignore с цепочкой методов

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // Ошибки кэширования не критичны
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## См. также

- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибки Future
- [Future::finally](/ru/docs/reference/future/finally.html) — Callback при завершении Future
