---
layout: docs
lang: en
path_key: "/docs/reference/future/construct.html"
nav_active: docs
permalink: /en/docs/reference/future/construct.html
page_title: "Future::__construct"
description: "Creates a Future bound to a FutureState."
---

# Future::__construct

(PHP 8.6+, True Async 1.0)

```php
public function __construct(FutureState $state)
```

Creates a new `Future` bound to a `FutureState` object. `FutureState` manages the Future's state and allows completing it externally with a result or error.

## Parameters

`state` — the `FutureState` object that manages the state of this Future.

## Examples

### Example #1 Creating a Future via FutureState

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Complete the Future from another coroutine
\Async\async(function() use ($state) {
    $result = performComputation();
    $state->complete($result);
});

// Await the result
$value = $future->await();
echo "Received: $value\n";
```

### Example #2 Creating a Future with a deferred result

```php
<?php

use Async\Future;
use Async\FutureState;

function createDeferredFuture(): array {
    $state = new FutureState();
    $future = new Future($state);
    return [$future, $state];
}

[$future, $state] = createDeferredFuture();

// One coroutine awaits the result
\Async\async(function() use ($future) {
    $result = $future->await();
    echo "Result: $result\n";
});

// Another coroutine provides the result
\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("Done!");
});
```

## See also

- [Future::completed](/en/docs/reference/future/completed.html) — Create an already completed Future
- [Future::failed](/en/docs/reference/future/failed.html) — Create a Future with an error
