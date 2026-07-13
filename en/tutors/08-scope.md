---
layout: tutorial
lang: en
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /en/tutors/08-scope.html
page_title: "Scope"
description: "Scope: who owns coroutines, waits for them to finish, and cancels the whole group."
---

# Scope

In the previous chapter we launched ten workers and closed the channel. The file
is read, `close()` has been called, and the main flow has moved on. But wait:
the workers are still working through the buffer. The import function has
already returned control, and the work isn't done. If the PHP script were to
end right now, some addresses would be left unchecked.

And a second worry from that same chapter: what if `checkAddress` inside a
worker throws an exception? From the chapter on exceptions we know it'll be
stored in the coroutine's handle, waiting for an `await`. But nobody was going
to `await` the workers. The error would surface right at the very end, when
it's too late to fix anything.

Both problems can be solved by hand: collect coroutines into an array and
await each one.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... reading the file ...

foreach ($workers as $worker) {
    await($worker);
}
```

It works. But it's bookkeeping: you have to remember to set up the array, carry
it through the whole code path, and iterate over it at the end. And if a
coroutine gets launched somewhere deep inside a called function, it never even
makes it into that array. What we want is for coroutines to know on their own
who they belong to.

That's what `Scope` is for.

## A sandbox for coroutines

`Scope` is a space in which coroutines live. It knows about every coroutine
launched inside it and can treat them as a group:

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        try {
            while (true) {
                checkAddress($queue->recv());
            }
        } catch (ChannelException) {
            // the channel is closed and empty
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

The difference from the previous chapter is two lines: `$workers->spawn()`
instead of `spawn()`, and `awaitCompletion()` at the end. The `awaitCompletion`
method waits until every coroutine in the scope finishes, however many there
are. No array, no bookkeeping: the scope keeps track on its own.

The cancellation token here isn't optional, it's a required argument: a scope
deliberately won't let you wait on a group without a bound. The familiar
`timeout` fits nicely, and if the import doesn't make it within a minute, the
wait is interrupted with an `OperationCanceledException`, and it's up to you
to decide: wait a bit longer, or cancel the group.

## Errors no longer get lost

Let's go back to the worker that crashed. A coroutine inside a scope can't die
silently: an unhandled exception bubbles up to the parent scope. By default,
a scope reacts strictly: an error in one coroutine cancels all the others, and
the exception is delivered to whoever is waiting in `awaitCompletion`.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

This strategy is called fail-together: the group either finishes as a whole,
or stops as a whole. For the import, that's reasonable: if `GeoDirectory` goes
down, there's no point bombarding it with the remaining nine workers.

But strictness isn't always what you want. One bad address in the file isn't
a reason to abandon the other ninety-nine thousand. In that case, you assign
the scope an error handler, and the coroutines become independent: the failed
one gets logged, the rest keep working:

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

Besides the exception itself, the handler receives the scope and the failed
coroutine: handy for figuring out exactly who died, or for restarting the work.

The choice of strategy is up to you, and that's the main difference from a
plain `spawn`: there, the only strategy is "fire and forget".

## Cancelling the whole group

In the chapter on cancellation we stopped a single coroutine with `cancel()`.
A scope does the same for an entire group at once:

```php
$workers->cancel();
```

Every coroutine inside receives the familiar `AsyncCancellation` at its own
wait point: some in `recv`, some in `delay`. The mechanism is the same,
cooperative, it's just that the signal goes out to everyone at once.

A scope can contain child scopes, and cancellation flows down the hierarchy
recursively: cancel the parent, and the whole branch is cancelled. Coroutines
stop being a scattered pile of independent tasks and form a tree, where each
one has a place and an owner. This approach is called structured concurrency,
and it's already proven itself in Kotlin, Swift, and Java. TrueAsync brings
it to PHP.

## A scope belongs to an object

The most elegant use of a scope: hand ownership of it to an object.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* workers and file reading */);
        $this->scope->spawn(/* the progress coroutine from the first chapter */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

The lifetime of the coroutines now matches the lifetime of the service. As
long as the object exists, its coroutines keep working. Destroy the object,
and `dispose()` cancels everything it managed to launch.

Remember `$progress->cancel()` from the first chapter? We manually caught the
moment when the progress coroutine became unnecessary. With a scope, that
question just goes away: progress is needed for as long as the import runs,
and it runs for exactly as long as `ImportService` lives. Ownership is
expressed directly in the code, and there's simply nowhere left to forget a
coroutine.

## The whole import, end to end

Let's put together everything we've accumulated over eight chapters into one
working class: the coroutines and progress from the first chapter, the
backpressure-aware channel from the seventh, the scope from this one.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Workers: pull addresses from the channel, no more than $this->workers concurrently
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                try {
                    while (true) {
                        checkAddress($queue->recv());
                        $counter++;
                    }
                } catch (ChannelException) {
                    // the channel is closed and empty, the work is done
                }
            });
        }

        // Progress: renders the state once a second until the import is done
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // Producer: reads the file, the channel's backpressure protects memory
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // Wait for everything: both the workers and the progress coroutine
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

A couple of details worth a closer look. Progress is no longer an infinite
loop: the condition `while ($counter < $total)` ends it cooperatively once the
last address has been processed, so `awaitCompletion` waits for everything
without a single `cancel`. And `dispose()` in the destructor plays no part in
normal operation at all: it's a safety net for when the import throws an
exception or the object gets discarded partway through.

That's the essentials of scope. `spawn` only answers the question "how do I
start concurrent work". Scope handles the questions that come right after:
who waits for that work, who finds out about an error, and who stops it.
Without a scope, a coroutine is left to fend for itself; inside a scope, it
has an owner and a place in the program's structure.

So far the workers have only been reading from the outside world. But checked
addresses still need to be saved to a database. Can we just hand ten
coroutines a single `PDO` object? A good question to open the next chapter.
