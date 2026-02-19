---
layout: docs
lang: ru
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /ru/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Callback всегда выполняется при завершении Future."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Регистрирует callback, который выполняется при завершении `Future` независимо от результата --- успеха, ошибки или отмены. Future резолвится с тем же значением или ошибкой, что и исходный. Полезен для освобождения ресурсов.

## Параметры

`finally` — функция, выполняемая при завершении. Не принимает аргументов. Сигнатура: `function(): void`.

## Возвращаемое значение

`Future` — новый Future, который завершится с тем же значением или ошибкой, что и исходный.

## Примеры

### Пример #1 Освобождение ресурсов

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Соединение закрыто\n";
});

$users = $future->await();
```

### Пример #2 Цепочка с map, catch и finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Ошибка: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Операция завершена\n";
});

$result = $future->await();
```

## См. также

- [Future::map](/ru/docs/reference/future/map.html) — Трансформация результата Future
- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибки Future
- [Future::ignore](/ru/docs/reference/future/ignore.html) — Игнорировать необработанные ошибки
