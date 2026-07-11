---
layout: tutorial
lang: en
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /en/tutors/02-cancellation.html
page_title: "Cancellation"
description: "How cancel() works, and cooperative coroutine cancellation."
---

# Cancellation

In the previous example there was an interesting call to the `cancel` function,
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

What happens if we remove it? Try it yourself.
The `$progress` coroutine spins in an infinite loop with a 1-second delay.
When `processUsers` finishes, control moves on. The `$progress` coroutine keeps running.
Forever. It will never stop. The PHP process will never stop (unless it's killed from the outside).

`$progress->cancel()` stops the `$progress` coroutine. But how?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Let's change the code around `delay(1000)` and see what happens:
```bash
Async\AsyncCancellation
```

When the `$progress` coroutine was asleep inside `delay(1000)` and `cancel()` was then called,
`delay` threw an `Async\AsyncCancellation` exception. Interestingly, this trick doesn't work with `sleep(1)`,
since `sleep(1)` doesn't throw an exception, while `delay` does, and that's exactly what we're relying on here.

You could say that using `delay` in your code effectively establishes a contract that lets other code
interrupt the coroutine's execution. This is very convenient, since it once again separates concerns
between different modules:
1. The coroutine doesn't know when its execution will be interrupted.
2. The code that cancels the coroutine doesn't know exactly how the coroutine will be interrupted.

A coroutine doesn't stop by some kind of magic, it stops via an exception.
A coroutine cannot be cancelled in the middle of some arbitrary operation, only at a point where it
itself chooses to yield. This type of cancellation is called "cooperative".
