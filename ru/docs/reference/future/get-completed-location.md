---
layout: docs
lang: ru
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /ru/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Место завершения Future как строка."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Возвращает информацию о месте завершения `Future` в виде форматированной строки. Удобно для логирования и отладки.

## Возвращаемое значение

`string` — строка формата `файл:строка`, например `/app/worker.php:15`. Если Future ещё не завершён, возвращает пустую строку.

## Примеры

### Пример #1 Получение места завершения как строки

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("результат");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Пример #2 Полная трассировка жизненного цикла Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future жизненный цикл:\n";
echo "  Создан в:   " . $future->getCreatedLocation() . "\n";
echo "  Завершён в: " . $future->getCompletedLocation() . "\n";
echo "  Результат:  " . $result . "\n";
```

## См. также

- [Future::getCompletedFileAndLine](/ru/docs/reference/future/get-completed-file-and-line.html) — Место завершения как массив
- [Future::getCreatedLocation](/ru/docs/reference/future/get-created-location.html) — Место создания как строка
- [Future::getAwaitingInfo](/ru/docs/reference/future/get-awaiting-info.html) — Информация об ожидающих
