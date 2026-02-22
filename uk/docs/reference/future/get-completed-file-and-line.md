---
layout: docs
lang: uk
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /uk/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Місце завершення Future у вигляді масиву."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Повертає інформацію про місце завершення `Future` (де було викликано `complete()` або `fail()` на пов'язаному `FutureState`). Містить ім'я файлу та номер рядка. Корисний для налагодження та відстеження асинхронних ланцюжків.

## Значення, що повертається

`array` — масив з ключами `file` (рядок, шлях до файлу) та `line` (ціле число, номер рядка). Якщо Future ще не завершено, повертає порожній масив.

## Приклади

### Приклад #1 Отримання місця завершення

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // line 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### Приклад #2 Порівняння місць створення та завершення

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## Дивіться також

- [Future::getCompletedLocation](/uk/docs/reference/future/get-completed-location.html) — Місце завершення у вигляді рядка
- [Future::getCreatedFileAndLine](/uk/docs/reference/future/get-created-file-and-line.html) — Місце створення Future
- [Future::getAwaitingInfo](/uk/docs/reference/future/get-awaiting-info.html) — Інформація про очікуючих
