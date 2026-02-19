---
layout: docs
lang: ru
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /ru/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Проверяет завершённость Future."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Проверяет, завершён ли `Future`. Future считается завершённым, если он содержит результат, ошибку или был отменён.

## Возвращаемое значение

`bool` — `true`, если Future завершён (успешно, с ошибкой или отменён), `false` в противном случае.

## Примеры

### Пример #1 Проверка завершённости Future

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

### Пример #2 Проверка статических фабричных методов

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## См. также

- [Future::isCancelled](/ru/docs/reference/future/is-cancelled.html) — Проверить, отменён ли Future
- [Future::await](/ru/docs/reference/future/await.html) — Ожидание результата Future
