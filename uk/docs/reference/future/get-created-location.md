---
layout: docs
lang: uk
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /uk/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Місце створення Future у вигляді рядка."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Повертає інформацію про місце створення `Future` у вигляді форматованого рядка. Зручний для логування та налагоджувального виводу.

## Значення, що повертається

`string` — рядок у форматі `file:line`, наприклад `/app/script.php:42`.

## Приклади

### Приклад #1 Отримання місця створення у вигляді рядка

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Приклад #2 Використання у налагоджувальних повідомленнях

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Debug long-running Futures
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## Дивіться також

- [Future::getCreatedFileAndLine](/uk/docs/reference/future/get-created-file-and-line.html) — Місце створення у вигляді масиву
- [Future::getCompletedLocation](/uk/docs/reference/future/get-completed-location.html) — Місце завершення у вигляді рядка
- [Future::getAwaitingInfo](/uk/docs/reference/future/get-awaiting-info.html) — Інформація про очікуючих
