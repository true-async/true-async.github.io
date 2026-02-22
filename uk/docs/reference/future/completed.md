---
layout: docs
lang: uk
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /uk/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Створює вже завершений Future з результатом."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Створює вже завершений `Future` із зазначеним значенням. Це фабричний метод, який повертає `Future`, що вже містить результат. Корисний для повернення вже відомого значення з функцій, що повертають `Future`.

## Параметри

`value` — значення, з яким Future буде завершено. За замовчуванням `null`.

## Значення, що повертається

`Future` — завершений Future із зазначеним значенням.

## Приклади

### Приклад #1 Створення Future з готовим значенням

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Приклад #2 Використання у функції, що повертає Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // If data is in cache, return immediately
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Otherwise start an async operation
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Result: $result\n";
```

## Дивіться також

- [Future::failed](/uk/docs/reference/future/failed.html) — Створити Future з помилкою
- [Future::__construct](/uk/docs/reference/future/construct.html) — Створити Future через FutureState
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат
