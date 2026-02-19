---
layout: docs
lang: ru
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /ru/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Место создания Future как строка."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Возвращает информацию о месте создания `Future` в виде форматированной строки. Удобно для логирования и вывода отладочных сообщений.

## Возвращаемое значение

`string` — строка формата `файл:строка`, например `/app/script.php:42`.

## Примеры

### Пример #1 Получение места создания как строки

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Пример #2 Использование в отладочных сообщениях

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Отладка долгих Future
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Предупреждение: Future, созданный в "
            . $future->getCreatedLocation()
            . ", не завершён более 5 секунд\n";
    }
});
```

## См. также

- [Future::getCreatedFileAndLine](/ru/docs/reference/future/get-created-file-and-line.html) — Место создания как массив
- [Future::getCompletedLocation](/ru/docs/reference/future/get-completed-location.html) — Место завершения как строка
- [Future::getAwaitingInfo](/ru/docs/reference/future/get-awaiting-info.html) — Информация об ожидающих
