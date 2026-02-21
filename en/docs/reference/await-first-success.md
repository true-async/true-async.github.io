---
layout: docs
lang: en
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /en/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — wait for the first successfully completed task, ignoring errors from others."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — Waits for the **first successfully** completed task. Errors from other tasks are collected separately and do not interrupt the wait.

## Description

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## Parameters

**`triggers`**
An iterable collection of `Async\Completable` objects.

**`cancellation`**
An optional Awaitable to cancel the wait.

## Return Values

An array of two elements: `[$result, $errors]`

- `$result` — the result of the first successfully completed task (or `null` if all tasks failed)
- `$errors` — array of exceptions from tasks that failed before the first success

## Examples

### Example #1 Fault-tolerant request

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// Try multiple servers; take the first successful response
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "Data received\n";
} else {
    echo "All servers unavailable\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## Notes

> **Note:** The `triggers` parameter accepts any `iterable`, including `Iterator` implementations. See the [Iterator example](/en/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array).

## See Also

- [await_any_or_fail()](/en/docs/reference/await-any-or-fail.html) — first task, error aborts
- [await_all()](/en/docs/reference/await-all.html) — all tasks with error tolerance
