---
layout: docs
lang: ru
path_key: "/docs/reference/future/failed.html"
nav_active: docs
permalink: /ru/docs/reference/future/failed.html
page_title: "Future::failed"
description: "Создаёт Future, завершённый с ошибкой."
---

# Future::failed

(PHP 8.6+, True Async 1.0)

```php
public static function failed(\Throwable $throwable): Future
```

Создаёт `Future`, который немедленно завершён с указанной ошибкой. При вызове `await()` на таком Future будет выброшено переданное исключение.

## Параметры

`throwable` — исключение, с которым Future будет завершён.

## Возвращаемое значение

`Future` — завершённый Future с ошибкой.

## Примеры

### Пример #1 Создание Future с ошибкой

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Ошибка загрузки"));

var_dump($future->isCompleted()); // bool(true)

try {
    $future->await();
} catch (\RuntimeException $e) {
    echo "Перехвачено: " . $e->getMessage() . "\n";
    // Перехвачено: Ошибка загрузки
}
```

### Пример #2 Использование для раннего возврата ошибки

```php
<?php

use Async\Future;

function connectToService(string $host): Future {
    if (empty($host)) {
        return Future::failed(
            new \InvalidArgumentException("Хост не может быть пустым")
        );
    }

    return \Async\async(function() use ($host) {
        return performConnection($host);
    });
}

$future = connectToService('');
$future->catch(function(\Throwable $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
});
```

## См. также

- [Future::completed](/ru/docs/reference/future/completed.html) — Создать Future с результатом
- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибки Future
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата
