---
layout: docs
lang: en
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /en/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — wait for the first N successfully completed tasks."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — Waits for the **first N** tasks to complete successfully. If one of the first N fails, throws an exception.

## Description

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parameters

**`count`**
The number of successful results to wait for. If `0`, returns an empty array.

**`triggers`**
An iterable collection of `Async\Completable` objects.

**`cancellation`**
An optional Awaitable to cancel the wait.

**`preserveKeyOrder`**
If `true`, result keys correspond to the input array keys. If `false`, in completion order.

## Return Values

An array of `$count` successful results.

## Errors/Exceptions

If a task fails before reaching `$count` successes, the exception is thrown.

## Examples

### Example #1 Getting 2 out of 5 results

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// Wait for any 2 successful responses
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## Notes

> **Note:** The `triggers` parameter accepts any `iterable`, including `Iterator` implementations. See the [Iterator example](/en/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## See Also

- [await_any_of()](/en/docs/reference/await-any-of.html) — first N with error tolerance
- [await_all_or_fail()](/en/docs/reference/await-all-or-fail.html) — all tasks
