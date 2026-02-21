---
layout: docs
lang: en
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /en/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — wait for all tasks with tolerance for partial failures."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — Waits for **all** tasks to complete, collecting results and errors separately. Does not throw an exception when individual tasks fail.

## Description

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## Parameters

**`triggers`**
An iterable collection of `Async\Completable` objects.

**`cancellation`**
An optional Awaitable to cancel the entire wait.

**`preserveKeyOrder`**
If `true` (default), results are in the key order of the input array. If `false`, in completion order.

**`fillNull`**
If `true`, `null` is placed in the results array for tasks that failed. If `false` (default), keys with errors are omitted.

## Return Values

An array of two elements: `[$results, $errors]`

- `$results` — array of successful results
- `$errors` — array of exceptions (keys correspond to the input task keys)

## Examples

### Example #1 Tolerating partial failures

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results contains 'fast' and 'slow'
// $errors contains 'broken' => Exception
foreach ($errors as $key => $error) {
    echo "Task '$key' failed: {$error->getMessage()}\n";
}
?>
```

### Example #2 With fillNull

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (instead of a missing key)
?>
```

## Notes

> **Note:** The `triggers` parameter accepts any `iterable`, including `Iterator` implementations. Coroutines can be created dynamically during iteration. See the [Iterator example](/en/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## See Also

- [await_all_or_fail()](/en/docs/reference/await-all-or-fail.html) — all tasks, error aborts
- [await_any_or_fail()](/en/docs/reference/await-any-or-fail.html) — first result
