---
layout: tutorial
lang: en
path_key: "/tutors/14-threads.html"
nav_active: docs
permalink: /en/tutors/14-threads.html
page_title: "Threads"
description: "spawn_thread and ThreadPool: true parallelism for computation, isolation, and data copying."
---

# Threads

All our tools so far have lived inside a single operating system thread. Coroutines created the
impression that things were happening at once, but at any given moment exactly one of them was
actually executing. For the import job and the requests to `GeoDirectory`, that was more than
enough: the tasks mostly waited, and waiting divides beautifully.

Now here's a different kind of task. Once a day, `ProfileService` builds an annual report: a
full minute of pure computation, without a single network or database call. Let's run it in a
coroutine, alongside our familiar ticker:

```php
spawn(function () {
    while (true) {
        echo "tick\n";
        delay(1000);
    }
});

spawn(function () {
    $report = buildYearlyReport($rows); // a minute of pure computation
    echo "report ready\n";
});
```

The ticker falls silent for a whole minute. Remember chapter one: coroutines switch at await
points, at `sleep`, `delay`, I/O. But `buildYearlyReport` doesn't have a single await point,
just loops and arithmetic. The scheduler never gets control back, and the entire process,
ticker, workers, request handling, all of it, just sits there watching one coroutine crunch
numbers.

Coroutines give you concurrency, not parallelism. When a task is bound by the CPU rather than by
waiting, you need a second processor. Or more precisely, a second operating system thread.

## spawn_thread

```php
use function Async\spawn_thread;
use function Async\await;

$thread = spawn_thread(fn() => buildYearlyReport($rows));

$report = await($thread);
```

`spawn_thread` launches the closure in a separate operating system thread, on a different CPU
core. The report is now computed truly in parallel: the ticker keeps ticking, the workers keep
working, and the scheduler has no idea heavy work is happening right next door.

From the outside, a thread looks almost like a coroutine: you can pass it to the familiar
`await`, which suspends only the waiting coroutine. An exception from the thread reaches `await`
too, wrapped in `Async\RemoteException`.

## Nothing in common

Almost like a coroutine, but with one fundamental difference. In the channels chapter we said
that coroutines live in shared memory, you can just hand over an object through `use`, and data
races don't happen within a single thread. Well, that trick doesn't work with threads. Each
thread has its own PHP environment: its own variables, its own classes, its own static
properties. There's no shared memory at all.

That's why everything passed into a thread is copied in full:

```php
$rows = loadRows();

$thread = spawn_thread(function () use ($rows) {
    // this is a COPY of $rows: changes here aren't visible outside
    return buildYearlyReport($rows);
});
```

This rule comes with restrictions too: you cannot pass a PHP reference (`&$var`), a resource
like an open file, or an object with dynamic properties into a thread. Attempting to do so
throws `ThreadTransferException` immediately, at the start, instead of causing mysterious
behavior later.

The rules are strict, but they're honest: with no shared state, there are no races, locks,
mutexes, or any of the other nightmares of classic multithreading. TrueAsync threads communicate
the same way coroutines do: by passing values, not by sharing memory.

By the way, one old acquaintance knows how to cross the thread boundary meaningfully.
`FutureState` from chapter six can be passed into a thread while its `Future` stays behind:

```php
$state  = new FutureState();
$future = new Future($state);

spawn_thread(function () use ($state) {
    $state->complete(buildYearlyReport(loadRows()));
});

$report = await($future);
```

The producer is in one thread, the consumer in another, and the contract is exactly the same.
That's why `Future` was split into two separate objects in the first place: the boundary
between them turned out to be sturdy enough to run a thread boundary right along it.

## ThreadPool

A thread is an expensive entity: its own PHP environment has to be created, initialized, and
warmed up. One task a minute, sure, no problem, but spinning up a thread for every tiny task is
just as wasteful as opening a database connection on every request.

You already know what to do with expensive resources. Right, pool them:

```php
use Async\ThreadPool;

$pool = new ThreadPool(workers: 8);

$futures = [];
foreach ($uploads as $path) {
    $futures[] = $pool->submit(makeThumbnail(...), $path);
}

foreach ($futures as $future) {
    echo await($future), "\n";
}

$pool->close();
```

Eight worker threads are created once and live as long as the pool does. `submit` puts a task in
the queue, a free worker picks it up and returns the result. And look at what `submit` returns:
a `Future`, a promise of a result that someone else will produce. In chapter six that "someone
else" was a coroutine; now it's an entire separate thread, and the contract hasn't changed one
bit.

The pool's queue has a limit, and once it fills up, `submit` suspends the calling coroutine.
Recognize that? It's the back-pressure from the channels chapter: the task producer
automatically paces itself to match the workers' speed.

Keep the number of workers close to the number of CPU cores: unlike waiting, computation needs
actual physical cores, and twenty threads on eight cores will just elbow each other out of the
way. By default, without the `workers` parameter, the pool figures out the available parallelism
on its own, even accounting for container quotas.

And for the most common case, "process a list in parallel," there's a one-line form you already
know from `iterate`:

```php
$thumbs = $pool->map($uploads, makeThumbnail(...));
```

`map` distributes the elements among the workers, waits for all of them, and returns the results
in their original order.

So it turns out concurrency has two dimensions. Coroutines compress waiting: thousands of tasks
share a single thread and don't get in each other's way while they wait. Threads add true
parallelism: computation spreads out across CPU cores. These tools don't compete with each
other, they complement each other: where code waits, reach for a coroutine; where it computes,
reach for a thread; and once you have a lot of either, a pool comes to the rescue.

Finally, take a look at what our process has turned into: hundreds of coroutines, all mixed
together, serving different users, tasks hopping between workers and threads. And in that crowd,
a simple question turns out to be surprisingly hard: where do you keep "the current one"? The
current user, the current language, the request ID? There's one global variable for everyone,
and there are thousands of coroutines. That's what the final chapter is about.
