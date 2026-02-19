---
layout: docs
lang: ru
path_key: "/docs/reference/future/completed.html"
nav_active: docs
permalink: /ru/docs/reference/future/completed.html
page_title: "Future::completed"
description: "Создаёт уже завершённый Future с результатом."
---

# Future::completed

(PHP 8.6+, True Async 1.0)

```php
public static function completed(mixed $value = null): Future
```

Создаёт уже завершённый `Future` с указанным значением. Это фабричный метод, который возвращает `Future`, немедленно содержащий результат. Полезен для возврата уже известного значения из функций, возвращающих `Future`.

## Параметры

`value` — значение, с которым Future будет завершён. По умолчанию `null`.

## Возвращаемое значение

`Future` — завершённый Future с указанным значением.

## Примеры

### Пример #1 Создание Future с готовым значением

```php
<?php

use Async\Future;

$future = Future::completed(42);

var_dump($future->isCompleted()); // bool(true)
var_dump($future->await());       // int(42)
```

### Пример #2 Использование в функции, возвращающей Future

```php
<?php

use Async\Future;

function fetchData(string $key): Future {
    // Если данные есть в кэше, возвращаем сразу
    $cached = getFromCache($key);
    if ($cached !== null) {
        return Future::completed($cached);
    }

    // Иначе запускаем асинхронную операцию
    return \Async\async(function() use ($key) {
        return loadFromDatabase($key);
    });
}

$result = fetchData('user:1')->await();
echo "Результат: $result\n";
```

## См. также

- [Future::failed](/ru/docs/reference/future/failed.html) — Создать Future с ошибкой
- [Future::__construct](/ru/docs/reference/future/construct.html) — Создать Future через FutureState
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата
