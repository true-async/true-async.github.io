---
layout: docs
lang: uk
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /uk/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Не передавати необроблені помилки обробнику циклу подій."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Позначає `Future` як ігнорований. Якщо Future завершується з помилкою і помилка не оброблена, вона не буде передана обробнику необроблених винятків циклу подій. Корисний для задач типу "запустив і забув", де результат не має значення.

## Значення, що повертається

`Future` — повертає той самий Future для ланцюжкового виклику методів.

## Приклади

### Приклад #1 Ігнорування помилок Future

```php
<?php

use Async\Future;
use Async\FutureState;

// Launch a task whose errors we don't care about
$state  = new FutureState();
$future = new Future($state);
$future->ignore();

\Async\spawn(function() use ($state) {
    // This operation may fail
    try {
        sendAnalytics(['event' => 'page_view']);
        $state->complete(null);
    } catch (\Throwable $e) {
        $state->error($e);
    }
});

// The error will not be passed to the event loop handler
```

### Приклад #2 Використання ignore з ланцюжком методів

```php
<?php

use Async\Future;
use Async\FutureState;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        $state = new FutureState();
        (new Future($state))->ignore();  // Cache errors are not critical

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

## Дивіться також

- [Future::catch](/uk/docs/reference/future/catch.html) — Обробити помилку Future
- [Future::finally](/uk/docs/reference/future/finally.html) — Зворотний виклик при завершенні Future
