---
layout: docs
lang: en
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /en/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — wait for the first N tasks with tolerance for partial failures."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — Waits for the **first N** tasks to complete, collecting results and errors separately. Does not throw an exception when individual tasks fail.

## Description

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parameters

**`count`**
The number of successful results to wait for.

**`triggers`**
An iterable collection of `Async\Completable` objects.

**`cancellation`**
An optional Awaitable to cancel the wait.

**`preserveKeyOrder`**
If `true`, result keys correspond to the input array keys.

**`fillNull`**
If `true`, `null` is placed in the results array for tasks that failed.

## Return Values

An array of two elements: `[$results, $errors]`

- `$results` — array of successful results (up to `$count` items)
- `$errors` — array of exceptions from tasks that failed

## Examples

### Example #1 Quorum with error tolerance

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// Wait for quorum: 3 out of 5 responses
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "Quorum reached\n";
} else {
    echo "Quorum not reached, errors: " . count($errors) . "\n";
}
?>
```

## Notes

> **Note:** The `triggers` parameter accepts any `iterable`, including `Iterator` implementations. See the [Iterator example](/en/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## See Also

- [await_any_of_or_fail()](/en/docs/reference/await-any-of-or-fail.html) — first N, error aborts
- [await_all()](/en/docs/reference/await-all.html) — all tasks with error tolerance
