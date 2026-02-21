---
layout: docs
lang: en
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /en/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Mark the coroutine as high-priority for the scheduler."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Marks the coroutine as high-priority. The scheduler will give preference to such coroutines when selecting the next task for execution.

The method returns the same coroutine object, enabling a fluent interface.

## Return Value

`Coroutine` -- the same coroutine object (fluent interface).

## Examples

### Example #1 Setting priority

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### Example #2 Fluent interface

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## See Also

- [spawn()](/en/docs/reference/spawn.html) -- Create a coroutine
