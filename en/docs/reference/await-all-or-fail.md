---
layout: docs
lang: en
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /en/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — wait for all tasks to complete; throws an exception on the first error."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — Waits for **all** tasks to complete successfully. On the first error, throws an exception and cancels the remaining tasks.

## Description

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## Parameters

**`triggers`**
An iterable collection of `Async\Completable` objects (coroutines, Futures, etc.).

**`cancellation`**
An optional Awaitable to cancel the entire wait (e.g., `timeout()`).

**`preserveKeyOrder`**
If `true` (default), results are returned in the key order of the input array. If `false`, in completion order.

## Return Values

An array of results from all tasks. Keys correspond to the input array keys.

## Errors/Exceptions

Throws the exception from the first task that failed.

## Examples

### Example #1 Parallel data loading

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### Example #2 With timeout

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "Not all tasks completed within 5 seconds\n";
}
?>
```

### Example #3 With Iterator instead of array

All `await_*` family functions accept not only arrays but any `iterable`, including `Iterator` implementations. This allows generating coroutines dynamically:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## See Also

- [await_all()](/en/docs/reference/await-all.html) — all tasks with error tolerance
- [await()](/en/docs/reference/await.html) — waiting for a single task
