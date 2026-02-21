---
layout: docs
lang: en
path_key: "/docs/reference/spawn.html"
nav_active: docs
permalink: /en/docs/reference/spawn.html
page_title: "spawn()"
description: "spawn() — launch a function in a new coroutine. Full documentation: parameters, return value, examples."
---

# spawn

(PHP 8.6+, True Async 1.0)

`spawn()` — Launches a function for execution in a new coroutine. Creates a coroutine.

## Description

```php
spawn(callable $callback, mixed ...$args): Async\Coroutine
```

Creates and starts a new coroutine. The coroutine will be executed asynchronously.

## Parameters

**`callback`**
A function or closure to execute in the coroutine. Can be any valid callable type.

**`args`**
Optional parameters passed to `callback`. Parameters are passed by value.

## Return Values

Returns an `Async\Coroutine` object representing the launched coroutine. The object can be used to:
- Obtain the result via `await()`
- Cancel execution via `cancel()`
- Check the coroutine's state

## Examples

### Example #1 Basic usage of spawn()

```php
<?php
use function Async\spawn;
use function Async\await;

function fetchData(string $url): string {
    return file_get_contents($url);
}

$coroutine = spawn(fetchData(...), 'https://php.net');

// The coroutine executes asynchronously
echo "Coroutine started\n";

$result = await($coroutine);
echo "Result received\n";
?>
```

### Example #2 Multiple coroutines

```php
<?php
use function Async\spawn;
use function Async\await;

$urls = [
    'https://php.net',
    'https://github.com',
    'https://stackoverflow.com'
];

$coroutines = [];
foreach ($urls as $url) {
    $coroutines[] = spawn(file_get_contents(...), $url);
}

// All requests execute concurrently
foreach ($coroutines as $coro) {
    $content = await($coro);
    echo "Downloaded: " . strlen($content) . " bytes\n";
}
?>
```

### Example #3 Using with a closure

```php
<?php
use function Async\spawn;
use function Async\await;

$userId = 123;

$coroutine = spawn(function() use ($userId) {
    $userData = file_get_contents("https://api/users/$userId");
    $userOrders = file_get_contents("https://api/orders?user=$userId");

    return [
        'user' => json_decode($userData),
        'orders' => json_decode($userOrders)
    ];
});

$data = await($coroutine);
print_r($data);
?>
```

### Example #4 spawn with Scope

```php
<?php
use function Async\spawn;
use Async\Scope;

$scope = new Scope();

$scope->spawn(function() {
    echo "Coroutine 1\n";
});

$scope->spawn(function() {
    echo "Coroutine 2\n";
});

// Wait for all coroutines in the scope to complete
$scope->awaitCompletion();
?>
```

### Example #5 Passing parameters

```php
<?php
use function Async\spawn;
use function Async\await;

function calculateSum(int $a, int $b, int $c): int {
    return $a + $b + $c;
}

$coroutine = spawn(calculateSum(...), 10, 20, 30);
$result = await($coroutine);

echo "Sum: $result\n"; // Sum: 60
?>
```

### Example #6 Error handling

One way to handle an exception from a coroutine is to use the `await()` function:

```php
<?php
use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    if (rand(0, 1)) {
        throw new Exception("Random error");
    }
    return "Success";
});

try {
    $result = await($coroutine);
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## Notes

> **Note:** Coroutines created via `spawn()` execute concurrently, but not in parallel.
> PHP TrueAsync uses a single-threaded execution model.

> **Note:** Parameters are passed to the coroutine by value.
> To pass by reference, use a closure with `use (&$var)`.

## Changelog

| Version  | Description                     |
|----------|---------------------------------|
| 1.0.0    | Added the `spawn()` function   |

## See Also

- [await()](/en/docs/reference/await.html) - Waiting for a coroutine result
- [suspend()](/en/docs/reference/suspend.html) - Suspending coroutine execution
