---
layout: tutorial
lang: en
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /en/tutors/01-coroutines.html
page_title: "Coroutines"
description: "A first look at coroutines: spawn() and concurrent execution."
---

# Creating Coroutines

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

The `counter` function prints a counter to the screen with a one-second pause:

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

Every time `sleep` is called, the PHP thread goes to sleep for the given duration.
During that time it's literally doing nothing.
The PHP script runs for 5 seconds, exactly as long as the function itself waits.

What happens if we run the `counter` function inside a coroutine?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

The output now alternates:
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

The script's total running time is still about 5 seconds, yet the script now behaves as though it's running two functions "concurrently".
So what's actually going on?

`spawn` creates a second logical thread of control, "B", inside which the `counter` function runs.
When thread "A" hits `sleep`, instead of blocking all of PHP, it hands control over to the other logical
thread, "B". And so on:

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## What's the Benefit?

Imagine that the `counter` function is ordinary sequential code that performs I/O operations and
timer work (`sleep`). I/O operations are handled by the operating system kernel, so PHP code has to
wait for them. Meanwhile, PHP could be doing something else.
Coroutines let you fill that waiting time with useful work, without creating separate processes, threads,
synchronization, data races, and the many other horrors of parallel programming.

Let's look at a practical example:

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

The `processUsers` function reads a CSV file and processes each row.
The file is large, and there's no need to print every row to the screen, but it would be nice to see progress.
We could redraw the progress bar on every iteration, but that would hurt processing performance.
We could redraw it every 100 iterations, but rows can take different amounts of time to process.
How do we show progress smoothly, at roughly even intervals?

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

This can be achieved with the `$progress` coroutine, which displays the current progress once a second.
It relies on the `$counter` variable, which is incremented inside the `processUsers` function and passed
into the coroutine by reference.

```bash
[====>                         ] 15%
```

The beauty of this solution is that `printProgress` knows nothing about `processUsers`, and vice versa.
They don't depend on each other, yet they work together.

In other words, coroutines don't just create the illusion of concurrent execution, they also help
separate concerns.

Did you notice `$progress->cancel()`? What is it there for, exactly?
