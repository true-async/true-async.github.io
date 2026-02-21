---
layout: docs
lang: en
path_key: "/docs/reference/future/get-created-file-and-line.html"
nav_active: docs
permalink: /en/docs/reference/future/get-created-file-and-line.html
page_title: "Future::getCreatedFileAndLine"
description: "Future creation location as an array."
---

# Future::getCreatedFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public function getCreatedFileAndLine(): array
```

Returns information about the `Future` creation location as an array. Contains the file name and line number where this Future was created. Useful for debugging and tracing.

## Return value

`array` — an array with keys `file` (string, file path) and `line` (integer, line number).

## Examples

### Example #1 Getting the creation location

```php
<?php

use Async\Future;

$future = Future::completed(42); // line 5

$location = $future->getCreatedFileAndLine();
echo "File: " . $location['file'] . "\n";
echo "Line: " . $location['line'] . "\n";
// File: /app/script.php
// Line: 5
```

### Example #2 Logging Future information

```php
<?php

use Async\Future;
use Async\FutureState;

function createTrackedFuture(): Future {
    $state = new FutureState();
    $future = new Future($state);

    $info = $future->getCreatedFileAndLine();
    error_log(sprintf(
        "Future created at %s:%d",
        $info['file'],
        $info['line']
    ));

    return $future;
}
```

## See also

- [Future::getCreatedLocation](/en/docs/reference/future/get-created-location.html) — Creation location as a string
- [Future::getCompletedFileAndLine](/en/docs/reference/future/get-completed-file-and-line.html) — Future completion location
- [Future::getAwaitingInfo](/en/docs/reference/future/get-awaiting-info.html) — Information about waiters
