---
layout: docs
lang: uk
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /uk/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Місце створення Future у вигляді масиву."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Повертає інформацію про місце створення `Future` у вигляді масиву. Містить ім'я файлу та номер рядка, де було створено цей Future. Корисний для налагодження та відстеження.

## Значення, що повертається

`array` — масив з ключами `file` (рядок, шлях до файлу) та `line` (ціле число, номер рядка).

## Приклади

### Приклад #1 Отримання місця створення

```php
<?php

use Async\Future;

$future = Future::completed(42); // line 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### Приклад #2 Логування інформації про Future

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## Дивіться також

- [Future::getCreatedLocation](/uk/docs/reference/future/get-created-location.html) — Місце створення у вигляді рядка
- [Future::getCompletedFileAndLine](/uk/docs/reference/future/get-completed-file-and-line.html) — Місце завершення Future
- [Future::getAwaitingInfo](/uk/docs/reference/future/get-awaiting-info.html) — Інформація про очікуючих
