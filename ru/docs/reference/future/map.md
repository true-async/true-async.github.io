---
layout: docs
lang: ru
path_key: "/docs/reference/future/map.html"
nav_active: docs
permalink: /ru/docs/reference/future/map.html
page_title: "Future::map"
description: "Трансформация результата Future."
---

# Future::map

(PHP 8.6+, True Async 1.0)

```php
public function map(callable $map): Future
```

Трансформирует результат `Future` с помощью callback-функции. Callback принимает значение завершённого Future и возвращает новое значение. Аналог `then()` в Promise-based API. Если исходный Future завершился с ошибкой, callback не вызывается, и ошибка передаётся в новый Future.

## Параметры

`map` — функция трансформации. Принимает результат Future, возвращает новое значение. Сигнатура: `function(mixed $value): mixed`.

## Возвращаемое значение

`Future` — новый Future, содержащий трансформированный результат.

## Примеры

### Пример #1 Трансформация результата

```php
<?php

use Async\Future;

$future = Future::completed(5)
    ->map(fn(int $x) => $x * 2)
    ->map(fn(int $x) => "Результат: $x");

echo $future->await(); // Результат: 10
```

### Пример #2 Цепочка трансформаций при асинхронной загрузке

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
echo "Количество пользователей: $count\n";
```

## См. также

- [Future::catch](/ru/docs/reference/future/catch.html) — Обработка ошибки Future
- [Future::finally](/ru/docs/reference/future/finally.html) — Callback при завершении Future
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата
