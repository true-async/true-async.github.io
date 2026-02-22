---
layout: docs
lang: uk
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /uk/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Налагоджувальна інформація про корутини, що очікують."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Повертає налагоджувальну інформацію про корутини, які наразі очікують завершення цього `Future`. Корисний для діагностики взаємних блокувань та аналізу залежностей між корутинами.

## Значення, що повертається

`array` — масив з інформацією про корутини, що очікують.

## Приклади

### Приклад #1 Отримання інформації про очікуючих

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Launch several coroutines awaiting one Future
\Async\async(function() use ($future) {
    $future->await();
});

\Async\async(function() use ($future) {
    $future->await();
});

// Give coroutines time to start waiting
\Async\delay(10);

$info = $future->getAwaitingInfo();
var_dump($info);
// Array with information about awaiting coroutines

$state->complete("done");
```

## Дивіться також

- [Future::getCreatedFileAndLine](/uk/docs/reference/future/get-created-file-and-line.html) — Місце створення Future
- [Future::getCreatedLocation](/uk/docs/reference/future/get-created-location.html) — Місце створення у вигляді рядка
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат
