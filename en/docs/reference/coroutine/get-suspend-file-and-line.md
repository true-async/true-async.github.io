---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "Get the file and line where the coroutine is suspended."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

Returns the file and line number where the coroutine was suspended (or was last suspended).

## Return Value

`array` -- an array of two elements:
- `[0]` -- file name (`string` or `null`)
- `[1]` -- line number (`int`)

## Examples

### Example #1 Basic usage

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // let the coroutine suspend

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## See Also

- [Coroutine::getSuspendLocation](/en/docs/reference/coroutine/get-suspend-location.html) -- Suspension location as a string
- [Coroutine::getSpawnFileAndLine](/en/docs/reference/coroutine/get-spawn-file-and-line.html) -- Creation file and line
