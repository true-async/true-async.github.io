---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "Get the file and line where the coroutine was created."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

Returns the file and line number where `spawn()` was called to create this coroutine.

## Return Value

`array` -- an array of two elements:
- `[0]` -- file name (`string` or `null`)
- `[1]` -- line number (`int`)

## Examples

### Example #1 Basic usage

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## See Also

- [Coroutine::getSpawnLocation](/en/docs/reference/coroutine/get-spawn-location.html) -- Creation location as a string
- [Coroutine::getSuspendFileAndLine](/en/docs/reference/coroutine/get-suspend-file-and-line.html) -- Suspension file and line
