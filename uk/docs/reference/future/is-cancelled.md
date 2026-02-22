---
layout: docs
lang: uk
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /uk/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Перевіряє, чи скасовано Future."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Перевіряє, чи було скасовано `Future`. Future вважається скасованим після виклику методу `cancel()`.

## Значення, що повертається

`bool` — `true`, якщо Future було скасовано, `false` в іншому випадку.

## Приклади

### Приклад #1 Перевірка скасування Future

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

### Приклад #2 Різниця між завершенням та скасуванням

```php
<?php

use Async\Future;

$completed = Future::completed("result");
var_dump($completed->isCancelled()); // bool(false)
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCancelled()); // bool(false)
var_dump($failed->isCompleted()); // bool(true)
```

## Дивіться також

- [Future::cancel](/uk/docs/reference/future/cancel.html) — Скасувати Future
- [Future::isCompleted](/uk/docs/reference/future/is-completed.html) — Перевірити, чи завершено Future
