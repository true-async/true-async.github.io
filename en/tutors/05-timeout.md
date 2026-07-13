---
layout: tutorial
lang: en
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /en/tutors/05-timeout.html
page_title: "Timeouts"
description: "Limiting how long await() waits, using timeout()."
---

# Limiting How Long await Waits

Often you need a guarantee that an operation won't take longer than some given time.
For example, if `UserDirectory` doesn't respond for too long, it can make the `API` feel broken.
There are two possible solutions here:
1. Set a timeout at the level of the `file_get_contents` operation and change the function's code.
2. Add a limit directly to `await`.

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

The benefit of limiting `await` is that there's no need to change the code of `validateToken`. At the
same time, notice the `catch (OperationCanceledException $e)`, not `catch (TimeoutException $e)` as you
might expect.

## OperationCanceledException

If we run the following code

```php
use function Async\timeout;
use Async\OperationCanceledException;
use Async\TimeoutException;

try {
    timeout(2000);
} catch (TimeoutException $e) {
    
}

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // message from TimeoutException
}
```

we can see that `timeout` throws a `TimeoutException`, yet the second block receives an
`OperationCanceledException`. This is intentional, to simplify the `try-catch` handling logic for
`await` and to clearly distinguish a cancelled wait from an exception raised inside the coroutine.
Coroutines normally should not throw `OperationCanceledException` themselves.

The thing used to limit an `await` wait doesn't have to be `timeout()`; it can also be any other
coroutine, or a `Future`, a logical contract representing the completion of some arbitrary operation.
