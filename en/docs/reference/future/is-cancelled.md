---
layout: docs
lang: en
path_key: "/docs/reference/future/is-cancelled.html"
nav_active: docs
permalink: /en/docs/reference/future/is-cancelled.html
page_title: "Future::isCancelled"
description: "Checks whether the Future is cancelled."
---

# Future::isCancelled

(PHP 8.6+, True Async 1.0)

```php
public function isCancelled(): bool
```

Checks whether the `Future` has been cancelled. A Future is considered cancelled after the `cancel()` method has been called.

## Return value

`bool` — `true` if the Future has been cancelled, `false` otherwise.

## Examples

### Example #1 Checking Future cancellation

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

### Example #2 Difference between completion and cancellation

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

## See also

- [Future::cancel](/en/docs/reference/future/cancel.html) — Cancel the Future
- [Future::isCompleted](/en/docs/reference/future/is-completed.html) — Check if the Future is completed
