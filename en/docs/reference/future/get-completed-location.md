---
layout: docs
lang: en
path_key: "/docs/reference/future/get-completed-location.html"
nav_active: docs
permalink: /en/docs/reference/future/get-completed-location.html
page_title: "Future::getCompletedLocation"
description: "Future completion location as a string."
---

# Future::getCompletedLocation

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedLocation(): string
```

Returns information about the `Future` completion location as a formatted string. Convenient for logging and debugging.

## Return value

`string` — a string in the format `file:line`, for example `/app/worker.php:15`. If the Future has not yet completed, returns an empty string.

## Examples

### Example #1 Getting the completion location as a string

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete("result");

echo $future->getCompletedLocation(); // /app/script.php:9
```

### Example #2 Full Future lifecycle tracing

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(50);
    $state->complete("done");
});

$result = $future->await();

echo "Future lifecycle:\n";
echo "  Created at:   " . $future->getCreatedLocation() . "\n";
echo "  Completed at: " . $future->getCompletedLocation() . "\n";
echo "  Result:       " . $result . "\n";
```

## See also

- [Future::getCompletedFileAndLine](/en/docs/reference/future/get-completed-file-and-line.html) — Completion location as an array
- [Future::getCreatedLocation](/en/docs/reference/future/get-created-location.html) — Creation location as a string
- [Future::getAwaitingInfo](/en/docs/reference/future/get-awaiting-info.html) — Information about waiters
