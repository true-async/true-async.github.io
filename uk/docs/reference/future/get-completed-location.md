---
layout: docs
lang: uk
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /uk/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Місце завершення Future у вигляді рядка."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Повертає інформацію про місце завершення `Future` у вигляді форматованого рядка. Зручний для логування та налагодження.

## Значення, що повертається

`string` — рядок у форматі `file:line`, наприклад `/app/worker.php:15`. Якщо Future ще не завершено, повертає порожній рядок.

## Приклади

### Приклад #1 Отримання місця завершення у вигляді рядка

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Приклад #2 Повне відстеження життєвого циклу Future

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

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## Дивіться також

- [Future::getCompletedFileAndLine](/uk/docs/reference/future/get-completed-file-and-line.html) — Місце завершення у вигляді масиву
- [Future::getCreatedLocation](/uk/docs/reference/future/get-created-location.html) — Місце створення у вигляді рядка
- [Future::getAwaitingInfo](/uk/docs/reference/future/get-awaiting-info.html) — Інформація про очікуючих
