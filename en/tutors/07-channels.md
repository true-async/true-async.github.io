---
layout: tutorial
lang: en
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /en/tutors/07-channels.html
page_title: "Channels"
description: "Channel: a stream of values between coroutines, a worker pool, and backpressure."
---

# Channels

`Future` promises exactly one value. But what if there are many values, and
they arrive gradually?

Recall the CSV file from the first chapter. Now the task is more serious: while
importing, every user's address needs to be checked against `GeoDirectory`.
We already know how to use coroutines, so let's try the direct approach:

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

The file has a hundred thousand rows. This code will create a hundred thousand
coroutines, and all of them will concurrently open a connection to `GeoDirectory`.
Coroutines are cheap, but connections aren't. The service will choke, and our
import along with it.

What we want instead is for, say, ten coroutines to handle the checking, while
the rest of the addresses wait their turn. We need a queue that some coroutines
pull work from and others add work to.

Such a queue is called a channel.

## Channel

A channel connects coroutines directly, like a pipe:

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — puts a value into the channel.
- **`recv`** — takes a value out of the channel.

Both operations block, and that's the whole point. If the channel is empty, `recv`
suspends the coroutine until data shows up. If the channel is full, it's `send`
that gets suspended instead. The `5` in the constructor sets the buffer size:
how many values the channel is willing to hold before anyone picks them up.

## Rendezvous

What happens if you create a channel with a buffer of `0`? It has nowhere to
store values, so `send` won't complete until another coroutine calls `recv`:

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // runs only after recv
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

Such a channel is called a rendezvous: the sender and the receiver are forced
to meet at the same point in time, hence the name.

The difference from a buffered channel is subtler than it looks. A buffer means
"sent" but not "received": `send` drops off a value and moves on, and the sender
has no idea whether, or when, it gets picked up. A rendezvous guarantees delivery:
once `send` returns, the value is already in the receiver's hands. That matters
when a task can't be left sitting in a queue: for example, handing work to a
worker only if it's free right now.

Data is almost beside the point here: a rendezvous is pure synchronization.
Two coroutines are guaranteed to meet at the same moment, even if all they
were passing was `null`.

## Worker pool

Let's assemble a solution for the import. Ten worker coroutines pull addresses
out of a channel, while the main flow reads the file and feeds the channel:

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        try {
            while (true) {
                checkAddress($queue->recv());
            }
        } catch (ChannelException) {
            // the channel is closed and empty, no more work is coming
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

Each value from the channel goes to exactly one worker, even if all ten are
waiting on `recv`. Values are never duplicated, so the workers don't step on
each other: the channel distributes the work among whoever is free on its own.

However many rows are in the file, there are never more than ten connections
to `GeoDirectory`. The number of workers is exactly the concurrency limit,
and it's set by a single constant in the loop.

## Backpressure

Why a buffer of exactly `100`? Imagine the workers check addresses slower than
the main flow reads the file. Without a limit, the queue would keep growing
until the entire hundred-thousand-row file sat in memory.

With a buffer of `100`, something different happens: as soon as a hundred
addresses pile up in the channel, `send` suspends the main flow. Reading the
file pauses and resumes once the workers free up space. The producer
automatically adjusts to the consumers' speed.

This mechanism is called backpressure. Notice that we didn't program it
ourselves: it falls out of the blocking nature of `send`. Just pick a buffer
size, and everything else balances itself.

## Closing a channel

Once the file is read, the workers keep waiting on `recv`. A familiar situation:
in the chapter on cancellation, the progress coroutine kept spinning forever too.
But here we don't need `cancel()` on every worker; a channel has a more precise
tool:

```php
$queue->close();
```

`close` announces: no new values are coming. The workers first finish reading
whatever is left in the buffer, and then `recv` throws `ChannelException`,
ending the `while (true)` loop. Notice the order: closing doesn't cut the work
short, it lets it finish properly.

And one more familiar detail: `recv` and `send` accept the same cancellation
token as the `await` from the timeouts chapter:

```php
$address = $queue->recv(timeout(5000));
```

If nothing shows up in the channel within five seconds, the worker gets an
`AsyncCancellation` and can, for example, log a warning.

## Passing data or synchronizing?

Let's take a closer look at what the channel was actually doing in this chapter.
`recv` on an empty channel put a worker to sleep until work showed up. `send` on
a full channel put the file-reading to sleep until the workers cleared the queue.
The rendezvous brought two coroutines together at the same moment in time. Every
blocking operation turned out to be a point where coroutines adjust to each other.

And here it's worth noting a subtlety of the single-threaded world. For passing
data as such, a channel isn't required: coroutines live in shared memory, and an
object can simply be handed to them via `use`. Data races don't happen within a
single thread; two coroutines are never executing at the exact same moment.
A channel is used for something else: a bounded queue, distributing work among
free workers, signaling "no more work" through `close`.

So it's more accurate to think of a channel this way: it's a way of synchronizing
coroutines that happens to move data along, not the other way around. In
multi-threaded code, though, where coroutines are spread across different
threads, a channel becomes indispensable in both roles: there's no shared memory
there, and it remains the one safe bridge.

Now we have two ways to link coroutines together. `Future` promises one value.
A channel carries a whole stream of values and, along the way, sets a shared
rhythm for the work: the producer doesn't know who will pick up the data or when,
the consumer doesn't know where it came from, but nobody floods anybody with work.

There's one nagging thought left. We launched ten workers and moved on. What if
one of them dies with an exception partway through the import? Who's actually
watching over all these coroutines? Let's find out in the next chapter.
