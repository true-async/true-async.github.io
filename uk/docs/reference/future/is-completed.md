---
layout: docs
lang: uk
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /uk/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Перевіряє, чи завершено Future."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Перевіряє, чи завершено `Future`. Future вважається завершеним, якщо він містить результат, помилку або був скасований.

## Значення, що повертається

`bool` — `true`, якщо Future завершено (успішно, з помилкою або скасовано), `false` в іншому випадку.

## Приклади

### Приклад #1 Перевірка завершення Future

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

var_dump($future->isCompleted()); // bool(false)

$state->complete(42);

var_dump($future->isCompleted()); // bool(true)
```

### Приклад #2 Перевірка статичних фабричних методів

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## Дивіться також

- [Future::isCancelled](/uk/docs/reference/future/is-cancelled.html) — Перевірити, чи скасовано Future
- [Future::await](/uk/docs/reference/future/await.html) — Очікувати результат Future
