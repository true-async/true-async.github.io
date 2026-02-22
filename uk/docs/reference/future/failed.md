---
layout: docs
lang: uk
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /uk/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Створює Future, завершений з помилкою."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Створює `Future`, який негайно завершується із зазначеною помилкою. Виклик `await()` на такому Future викине переданий виняток.

## Параметри

`throwable` — виняток, з яким Future буде завершено.

## Значення, що повертається

`Future` — завершений Future з помилкою.

## Приклади

### Приклад #1 Створення Future з помилкою

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Loading error"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Caught: " . $e->getMessage() . "\n";
    // Caught: Loading error
}
```

### Приклад #2 Використання для раннього повернення помилки

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Host cannot be empty")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
});
```

## Дивіться також

- [Future::completed](/uk/docs/reference/future/completed.html) — Створити Future з результатом
- [Future::catch](/uk/docs/reference/future/catch.html) — Обробити помилку Future
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат
