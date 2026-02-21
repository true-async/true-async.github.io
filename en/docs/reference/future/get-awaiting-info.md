---
layout: docs
lang: en
path_key: "/docs/reference/future/get-awaiting-info.html"
nav_active: docs
permalink: /en/docs/reference/future/get-awaiting-info.html
page_title: "Future::getAwaitingInfo"
description: "Debug information about awaiting coroutines."
---

# Future::getAwaitingInfo

(PHP 8.6+, True Async 1.0)

```php
public function getAwaitingInfo(): array
```

Returns debug information about coroutines that are currently awaiting the completion of this `Future`. Useful for diagnosing deadlocks and analyzing dependencies between coroutines.

## Return value

`array` — an array with information about awaiting coroutines.

## Examples

### Example #1 Getting information about waiters

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

## See also

- [Future::getCreatedFileAndLine](/en/docs/reference/future/get-created-file-and-line.html) — Future creation location
- [Future::getCreatedLocation](/en/docs/reference/future/get-created-location.html) — Creation location as a string
- [Future::await](/en/docs/reference/future/await.html) — Await the result
