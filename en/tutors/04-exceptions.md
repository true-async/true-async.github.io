---
layout: tutorial
lang: en
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /en/tutors/04-exceptions.html
page_title: "Exceptions"
description: "How exceptions from a coroutine propagate through await()."
---

# Exceptions in Coroutines

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

The `validateToken` function from the previous chapter has a few problems.
If `UserDirectory` doesn't respond (timeout, network down, DNS not resolving), `file_get_contents` returns `false`.
`json_decode(false)` returns `null`, and `null->valid` is also `null`. The function returns something falsy,
the same result as with an actually invalid token. `validateToken` has no way to tell "the token expired"
apart from "`UserDirectory` didn't respond", even though these are two completely different situations.

The right approach is to throw an exception when the service doesn't respond:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

But what happens if an exception is thrown inside a coroutine?
If an exception is thrown in regular `PHP` code and nobody catches it, `PHP` terminates with an Unhandled
Exception message. What about a coroutine?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

At first glance it looks like there's no difference. But that's far from true.
Coroutines belong to the `Scheduler` component, which is responsible for switching between them. Each
coroutine runs in its own logical thread. If an unhandled exception reaches the coroutine's final handler,
it gets stored on the coroutine's handle.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

In other words, the exception won't terminate the program as long as someone still holds a reference
to `$coroutine`. This logic guarantees idempotency for the `await` operation.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Repeated calls to `await` on the same coroutine produce the same behavior, regardless of whether the
coroutine is still running or not. This lets you treat a coroutine like a `Future`, a promise of a result
that can be obtained at some point in the future. If the result already exists, `await` returns it
immediately.

Now we can improve the code that validates the token and updates the profile by adding exception handling:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Maybe worth retrying the operation later?
}
```

> Important!
> After calling `await` or any other `await_*` operation,
> the coroutine is marked as handled, and its exception will no longer cause
> the PHP program to terminate.
