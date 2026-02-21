---
layout: docs
lang: en
path_key: "/docs/reference/future/is-completed.html"
nav_active: docs
permalink: /en/docs/reference/future/is-completed.html
page_title: "Future::isCompleted"
description: "Checks whether the Future is completed."
---

# Future::isCompleted

(PHP 8.6+, True Async 1.0)

```php
public function isCompleted(): bool
```

Checks whether the `Future` is completed. A Future is considered completed if it contains a result, an error, or has been cancelled.

## Return value

`bool` — `true` if the Future is completed (successfully, with an error, or cancelled), `false` otherwise.

## Examples

### Example #1 Checking Future completion

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

### Example #2 Checking static factory methods

```php
<?php

use Async\Future;

$completed = Future::completed("done");
var_dump($completed->isCompleted()); // bool(true)

$failed = Future::failed(new \RuntimeException("error"));
var_dump($failed->isCompleted()); // bool(true)
```

## See also

- [Future::isCancelled](/en/docs/reference/future/is-cancelled.html) — Check if the Future is cancelled
- [Future::await](/en/docs/reference/future/await.html) — Await the Future result
