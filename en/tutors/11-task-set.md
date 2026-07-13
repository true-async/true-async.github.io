---
layout: tutorial
lang: en
path_key: "/tutors/11-task-set.html"
nav_active: docs
permalink: /en/tutors/11-task-set.html
page_title: "TaskSet"
description: "TaskSet: a self-cleaning stream of tasks, joinNext/joinAny/joinAll, and a supervisor loop."
---

# TaskSet

The previous chapter revealed that `TaskGroup` remembers everything. That's not an accident,
it's a property you can rely on: no matter how many times you ask the group for results, you
get the same answer. This behavior is called idempotence, and we've already run into it before:
a repeated `await` on a coroutine returns the same result every time.

But memory has a price. Run a hundred thousand tasks through a group, and all hundred thousand
results stay sitting inside it, even if each one was only ever needed once, the moment it became
ready. For a pipeline that runs for hours, that's not storage, it's a leak.

What's needed is a twin of `TaskGroup` with the opposite temperament: hand over the result and
forget it. It's called `TaskSet`.

## Consuming instead of storing

On the surface everything looks the same: `spawn`, `close`, a concurrency limit. The difference
is in what happens to a result after it's delivered:

```php
use Async\TaskSet;

$set = new TaskSet();

$set->spawn(fn() => 'alpha');
$set->spawn(fn() => 'beta');
$set->spawn(fn() => 'gamma');

echo $set->joinNext()->await(); // alpha
echo $set->joinNext()->await(); // beta, already a different one!
echo $set->joinNext()->await(); // gamma

echo $set->count(); // 0, the set is empty
```

Each call to `joinNext()` returns the next ready result and removes its entry from the set.
Compare that to `TaskGroup`'s `race()`, which returns the same first winner no matter how many
times you call it. `TaskSet` behaves not like storage but like a queue: read it, and it's gone.
Yes, that's the same semantics as `recv` from the channels chapter, except now the queue holds
not values but completing tasks.

The twins' waiting methods rhyme with each other:

- **`joinNext()`** — like `race()`: the first one to finish, its entry removed.
- **`joinAny()`** — like `any()`: the first successful one, its entry removed.
- **`joinAll()`** — like `all()`: all results at once, the set drained.

The `join` prefix hints at the difference itself: a result isn't just read, it's withdrawn.

## A pipeline without a leak

Let's rewrite the hundred-thousand-row import with what we now know:

```php
$set = new TaskSet(concurrency: 10);

spawn(function () use ($set, $handle, $addressIndex) {
    while (($row = fgetcsv($handle)) !== false) {
        $set->spawn(fn() => checkAddress($row[$addressIndex]));
    }
    $set->close();
});

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        error_log("Address not verified: {$error->getMessage()}");
        continue;
    }
    saveAddress($pdo, $result);
}
```

One coroutine reads the file and keeps feeding it tasks, while the main flow processes results
as they become ready. Each processed entry is immediately removed from the set, so memory only
holds the tasks in flight: ten running plus the queue. The file can be any size; memory usage
doesn't depend on it.

Notice how familiar details have come together into a new picture: a concurrency limit instead
of a hand-rolled worker pool, `close()` as the signal that "no more tasks are coming," the
`[$result, $error]` pair instead of silently swallowed exceptions, and the `PDO` from chapter
nine, unbothered by concurrent calls to `saveAddress`.

## Supervisor

There's a second scenario where this consuming semantics is indispensable: code that watches
over long-lived tasks and reacts when they finish.

```php
$set = new TaskSet();

$set->spawnWithKey('mailer',  runMailer(...));
$set->spawnWithKey('metrics', runMetrics(...));
$set->spawnWithKey('cleaner', runCleaner(...));

foreach ($set as $key => [$result, $error]) {
    error_log("Service $key stopped" . ($error ? ": {$error->getMessage()}" : ''));

    // restart the service that went down
    $set->spawnWithKey($key, restartService($key));
}
```

The set is never closed, so the `foreach` never finishes, it just waits for the next event. Each
processed entry is removed, the restarted service is added back in its place, and the loop lives
forever. The supervisor doesn't need a history of every completion since the dawn of time; it
needs exactly this: one of its charges stopped, go figure out why and restart it. You couldn't
write this loop with `TaskGroup`: its `foreach` would start over from the first service that
stopped, every single time.

So that, essentially, is the whole difference between the twins: memory. A group stores results
and answers any question about them repeatedly, which makes it good for cases where the set of
tasks is fixed and the results matter as a whole. A set hands over each result once and
immediately frees the memory, which is why it can handle an endless stream of tasks. There's a
simple rule for choosing: if your question to the tasks is "what did you come up with?", reach
for `TaskGroup`; if it's "what's next?", reach for `TaskSet`.

Over the last four chapters we've built the same thing three times: walk a collection, doing
concurrent work on each element under a limit. Once with a channel and workers, once with
`TaskGroup`, once with `TaskSet`. Isn't it time this pattern got a name of its own and shrank
down to a single line?
