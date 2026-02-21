---
layout: docs
lang: en
path_key: "/docs/reference/future/get-completed-file-and-line.html"
nav_active: docs
permalink: /en/docs/reference/future/get-completed-file-and-line.html
page_title: "Future::getCompletedFileAndLine"
description: "Future completion location as an array."
---

# Future::getCompletedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCompletedFileAndLine(): array
```

Returns information about the location where the `Future` was completed (where `complete()` or `fail()` was called on the associated `FutureState`). Contains the file name and line number. Useful for debugging and tracing async chains.

## Return value

`array` — an array with keys `file` (string, file path) and `line` (integer, line number). If the Future has not yet completed, returns an empty array.

## Examples

### Example #1 Getting the completion location

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

$state->complete(42); // line 8

$location = $future->getCompletedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 8
```

### Example #2 Comparing creation and completion locations

```php
<?php

use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);

\Async\async(function() use ($state) {
    \Async\delay(100);
    $state->complete("result");
});

$future->await();

echo "Created at: " . $future->getCreatedLocation() . "\n";
$completed = $future->getCompletedFileAndLine();
echo "Completed at: " . $completed['file'] . ":" . $completed['line'] . "\n";
```

## See also

- [Future::getCompletedLocation](/en/docs/reference/future/get-completed-location.html) — Completion location as a string
- [Future::getCreatedFileAndLine](/en/docs/reference/future/get-created-file-and-line.html) — Future creation location
- [Future::getAwaitingInfo](/en/docs/reference/future/get-awaiting-info.html) — Information about waiters
