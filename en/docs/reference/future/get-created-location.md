---
layout: docs
lang: en
path_key: "/docs/reference/future/get-created-location.html"
nav_active: docs
permalink: /en/docs/reference/future/get-created-location.html
page_title: "Future::getCreatedLocation"
description: "Future creation location as a string."
---

# Future::getCreatedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedLocation(): string
```

Returns information about the `Future` creation location as a formatted string. Convenient for logging and debug output.

## Return value

`string` — a string in the format `file:line`, for example `/app/script.php:42`.

## Examples

### Example #1 Getting the creation location as a string

```php
<?php

use Async\Future;

$future = Future::completed("hello");

echo $future->getCreatedLocation(); // /app/script.php:5
```

### Example #2 Using in debug messages

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

// Debug long-running Futures
\Async\async(function() use ($future) {
    \Async\delay(5000);
    if (!$future->isCompleted()) {
        echo "Warning: Future created at "
            . $future->getCreatedLocation()
            . " has not completed in over 5 seconds\n";
    }
});
```

## See also

- [Future::getCreatedFileAndLine](/en/docs/reference/future/get-created-file-and-line.html) — Creation location as an array
- [Future::getCompletedLocation](/en/docs/reference/future/get-completed-location.html) — Completion location as a string
- [Future::getAwaitingInfo](/en/docs/reference/future/get-awaiting-info.html) — Information about waiters
