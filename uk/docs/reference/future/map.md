---
layout: docs
lang: uk
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /uk/docs/reference/future/map.html
page_title: "Future::map"
description: "Перетворення результату Future."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Перетворює результат `Future` за допомогою функції зворотного виклику. Зворотний виклик отримує значення завершеного Future та повертає нове значення. Аналог `then()` у Promise-based API. Якщо оригінальний Future завершився з помилкою, зворотний виклик не спрацьовує, і помилка передається до нового Future.

## Параметри

`map` — функція перетворення. Отримує результат Future, повертає нове значення. Сигнатура: `function(mixed $value): mixed`.

## Значення, що повертається

`Future` — новий Future з перетвореним результатом.

## Приклади

### Приклад #1 Перетворення результату

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Result: $x");

echo $future->await(); // Result: 10
```

### Приклад #2 Ланцюжок перетворень для асинхронного завантаження

```php
<?php

use Async\Future;

$future = \Async\async(function() {
    return file_get_contents('https://api.example.com/data');
})
->map(fn(string $json) => json_decode($json, true))
->map(fn(array $data) => $data['users'])
->map(fn(array $users) => count($users));

$count = $future->await();
echo "Number of users: $count\n";
```

## Дивіться також

- [Future::catch](/uk/docs/reference/future/catch.html) — Обробити помилку Future
- [Future::finally](/uk/docs/reference/future/finally.html) — Зворотний виклик при завершенні Future
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат
