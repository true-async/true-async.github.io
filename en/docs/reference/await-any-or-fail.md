---
layout: docs
lang: en
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /en/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — wait for the first completed task."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — Waits for the **first** task to complete. If the first completed task threw an exception, it is propagated.

## Description

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## Parameters

**`triggers`**
An iterable collection of `Async\Completable` objects.

**`cancellation`**
An optional Awaitable to cancel the wait.

## Return Values

The result of the first completed task.

## Errors/Exceptions

If the first completed task threw an exception, it will be propagated.

## Examples

### Example #1 Request race

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// Whichever responds first wins
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "Received response from the fastest mirror\n";
?>
```

## Notes

> **Note:** The `triggers` parameter accepts any `iterable`, including `Iterator` implementations. See the [Iterator example](/en/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## See Also

- [await_first_success()](/en/docs/reference/await-first-success.html) — first success, ignoring errors
- [await_all_or_fail()](/en/docs/reference/await-all-or-fail.html) — all tasks
