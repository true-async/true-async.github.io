---
layout: tutorial
lang: en
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /en/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup: a group of tasks with results, and the all, race, any waiting strategies."
---

# TaskGroup

Suppose a user profile page is assembled from three sources: user data from the
database, orders from the database, and reviews from an external API. The
sources don't depend on each other, so they should be requested concurrently.
We already know how to do this:

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

Tolerable for three tasks. But look closely: this is once again the manual
bookkeeping from the chapter on `Scope`, except now we also need the results.
Every coroutine has to be remembered and awaited, and if `fetchUser` throws an
exception, `fetchOrders` and `fetchReviews` will keep running for nothing:
they'd have to be cancelled "by hand" in a `catch`.

And there are tasks where the manual approach becomes genuinely painful. For
example, taking the result of whichever coroutine finishes first and cancelling
the rest. Try writing that with `await` in a loop and you'll end up with a
tangle of checks and cancellations.

`Scope` isn't much help here either: it manages the lifetime of coroutines, but
knows nothing about their results. We need a higher-level primitive.

## A group of tasks

`TaskGroup` bundles tasks into a single whole: it runs them in its own `Scope`,
stores their results, and lets you wait for the group as one unit:

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

The `all()` method returns a familiar `Future`, which resolves to an array of
results once every task has finished. We assigned the keys ourselves via
`spawnWithKey`, so the array holds named entries instead of plain indexes.

And since it's a `Future`, a timeout comes for free, via the same token as
always:

```php
$data = $group->all()->await(timeout(5000));
```

If even one task throws an exception, the group behaves like the Scope from
chapter eight: the remaining tasks get cancelled, and `await` throws a
`CompositeException` holding all the errors. The group either collects
everything, or collects nothing: there's no in-between state.

## First to finish: race

`all()` is just one of the waiting strategies. Think back to `GeoDirectory`:
it has three replicas, and one of them is sometimes slow. The classic trick:
send the request to all replicas and take the first answer:

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` resolves with the result of whichever task finishes first, whether
that's success or failure. Exactly the "take the first one and don't wait for
the rest" scenario that's so painful to write by hand.

## First to succeed: any

`race()` has a hard edge: if the first task to finish happens to be a failed
one, you get its exception. Sometimes you need something gentler: try several
providers and take the first successful answer, turning a blind eye to
failures:

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` ignores the failures and returns the first winner. You only get an
exception if every task fails, and it will be a `CompositeException` with the
full list of causes. Notice the `suppressErrors()` call: nobody handled the
errors from the losing providers, and the group wants explicit confirmation
that this was intentional. A familiar principle from the chapter on
exceptions: an error can't just quietly disappear.

## Concurrency limit

And now for something unexpected. Remember the worker pool from the chapter
on channels: a channel, ten coroutines, a `recv` loop? `TaskGroup` can do the
same thing in a few lines:

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // results arrive as they become ready
}
```

The `concurrency: 10` parameter caps how many tasks run at once: the rest
wait in line and don't even spin up a coroutine until a slot frees up.
`close()` plays the same role it does for a channel: it announces that no new
tasks are coming. And `foreach` hands out results as they become ready,
without waiting for the whole group to finish.

Does that mean the channel wasn't needed after all? No. A channel is a
synchronization primitive you can build anything out of. `TaskGroup` is a
ready-made assembly for the most common case: "run a set of tasks and get the
results". When a task fits that pattern, reach for `TaskGroup`; when you need
a non-standard topology, channels and Scope are still there in your hands.

Bottom line: `TaskGroup` is a Scope plus results. A group of tasks turns into
a single value you can ask for everything at once, the first to finish, or
the first to succeed.

One last detail: `TaskGroup` carefully keeps all the results around. Call
`race()` twice, and you'll get the same answer both times. Iterate the group
with `foreach` again, and it hands out everything from the start once more.
For a profile page, that's convenient. Now picture a pipeline that runs a
hundred thousand tasks through a group. Everything the group remembers lives
in memory. See the catch? That's what we'll talk about in the next chapter.
