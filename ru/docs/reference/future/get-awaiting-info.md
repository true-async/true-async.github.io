---
layout: docs
lang: ru
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /ru/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Отладочная информация об ожидающих корутинах."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Возвращает отладочную информацию о корутинах, которые в данный момент ожидают завершения данного `Future`. Полезно для диагностики deadlock-ов и анализа зависимостей между корутинами.

## Возвращаемое значение

`array` — массив с информацией об ожидающих корутинах.

## Примеры

### Пример #1 Получение информации об ожидающих

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Запускаем несколько корутин, ожидающих один Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Даём корутинам начать ожидание
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Массив с информацией об ожидающих корутинах

$state->complete("done");
```

## См. также

- [Future::getCreatedFileAndLine](/ru/docs/reference/future/get-created-file-and-line.html) — Место создания Future
- [Future::getCreatedLocation](/ru/docs/reference/future/get-created-location.html) — Место создания как строка
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата
