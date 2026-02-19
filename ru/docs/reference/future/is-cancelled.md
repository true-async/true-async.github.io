---
layout: docs
lang: ru
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /ru/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Проверяет, отменён ли Future."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Проверяет, был ли `Future` отменён. Future считается отменённым после вызова метода `cancel()`.

## Возвращаемое значение

`bool` — `true`, если Future был отменён, `false` в противном случае.

## Примеры

### Пример #1 Проверка отмены Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCancelled()); // bool(false)

$future->cancel();

var_dump($future->isCancelled()); // bool(true)
var_dump($future->isCompleted()); // bool(true)
```

### Пример #2 Различие между завершением и отменой

```php
<?php

use Async\Future;

$completed = Future::completed("результат");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("ошибка"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## См. также

- [Future::cancel](/ru/docs/reference/future/cancel.html) — Отменить Future
- [Future::isCompleted](/ru/docs/reference/future/is-completed.html) — Проверить завершённость Future
