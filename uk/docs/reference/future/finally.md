---
layout: docs
lang: uk
path_key: "/docs/reference/future/finally.html"
nav_active: docs
permalink: /uk/docs/reference/future/finally.html
page_title: "Future::finally"
description: "Зворотний виклик, що завжди виконується при завершенні Future."
---

# Future::finally

(PHP 8.6+, True Async 1.0)

```php
public function finally(callable $finally): Future
```

Реєструє зворотний виклик, який виконується при завершенні `Future` незалежно від результату --- успіх, помилка або скасування. Future повертає те саме значення або помилку, що й оригінальний. Корисний для звільнення ресурсів.

## Параметри

`finally` — функція, що виконується при завершенні. Не приймає аргументів. Сигнатура: `function(): void`.

## Значення, що повертається

`Future` — новий Future, який завершиться з тим самим значенням або помилкою, що й оригінальний.

## Приклади

### Приклад #1 Звільнення ресурсів

```php
<?php

use Async\Future;

$connection = openDatabaseConnection();

$future = \Async\async(function() use ($connection) {
    return $connection->query("SELECT * FROM users");
})
->finally(function() use ($connection) {
    $connection->close();
    echo "Connection closed\n";
});

$users = $future->await();
```

### Приклад #2 Ланцюжок з map, catch та finally

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return fetchDataFromApi();
})
->map(fn($data) => processData($data))
->catch(function(\Throwable $e) {
    error_log("Error: " . $e->getMessage());
    return [];
})
->finally(function() {
    echo "Operation completed\n";
});

$result = $future->await();
```

## Дивіться також

- [Future::map](/uk/docs/reference/future/map.html) — Перетворити результат Future
- [Future::catch](/uk/docs/reference/future/catch.html) — Обробити помилку Future
- [Future::ignore](/uk/docs/reference/future/ignore.html) — Ігнорувати необроблені помилки
