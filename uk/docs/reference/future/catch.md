---
layout: docs
lang: uk
path_key: "/docs/reference/future/catch.html"
nav_active: docs
permalink: /uk/docs/reference/future/catch.html
page_title: "Future::catch"
description: "Обробка помилки Future."
---

# Future::catch

(PHP 8.6+, True Async 1.0)

```php
public function catch(callable $catch): Future
```

Реєструє обробник помилок для `Future`. Зворотний виклик спрацьовує, якщо Future завершився з винятком. Якщо зворотний виклик повертає значення, воно стає результатом нового Future. Якщо зворотний виклик викидає виняток, новий Future завершується з цією помилкою.

## Параметри

`catch` — функція обробки помилок. Отримує `Throwable`, може повертати значення для відновлення. Сигнатура: `function(\Throwable $e): mixed`.

## Значення, що повертається

`Future` — новий Future з результатом обробки помилки або з оригінальним значенням, якщо помилки не було.

## Приклади

### Приклад #1 Обробка помилок з відновленням

```php
<?php

use Async\Future;

$future = Future::failed(new \RuntimeException("Service unavailable"))
    ->catch(function(\Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n";
        return "default value"; // Recovery
    });

$result = $future->await();
echo $result; // default value
```

### Приклад #2 Перехоплення помилок у асинхронних операціях

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    $response = httpGet('https://api.example.com/users');
    if ($response->status !== 200) {
        throw new \RuntimeException("HTTP error: {$response->status}");
    }
    return json_decode($response->body, true);
})
->catch(function(\Throwable $e) {
    // Log the error and return an empty array
    error_log("API error: " . $e->getMessage());
    return [];
})
->map(function(array $users) {
    return count($users);
});

$count = $future->await();
echo "Users found: $count\n";
```

## Дивіться також

- [Future::map](/uk/docs/reference/future/map.html) — Перетворити результат Future
- [Future::finally](/uk/docs/reference/future/finally.html) — Зворотний виклик при завершенні Future
- [Future::ignore](/uk/docs/reference/future/ignore.html) — Ігнорувати необроблені помилки
