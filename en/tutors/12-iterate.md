---
layout: tutorial
lang: en
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /en/tutors/12-iterate.html
page_title: "Concurrent Iterator"
description: "iterate(): concurrent collection traversal in a single line, generators, and early exit."
---

# Concurrent Iterator

Let's count how many times we've built the same pattern. In the channels chapter: a channel,
ten workers, a `recv` loop. In the TaskGroup chapter: `concurrency: 10`, a `spawn` loop,
`close()`. In the TaskSet chapter: the same thing, but consuming results. Every time, the task
sounded the same: walk a collection, do concurrent work on each element, and never exceed the
limit.

A pattern this common deserves a function of its own:

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

And that's the whole worker pool. `iterate` calls the function for each element of the
collection in its own coroutine, makes sure no more than ten run concurrently, and returns
control once everything has been processed.

## A generator instead of an array

Wait, what about reading the file? Collecting a hundred thousand addresses into an array just
to call `iterate` would be a step backwards: the back-pressure from the channels chapter was
what saved us memory. No problem: `iterate` accepts not just an array but any `Traversable`,
including generators:

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

The generator reads the file lazily, one line at a time. `iterate` only pulls the next address
once a slot frees up, so the file is never held in memory all at once. It's the same
back-pressure a buffered channel gives you, except now it's invisible: all that's left is a
single line expressing the intent.

## Early exit

The handler function can stop the whole traversal by returning `false`:

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // the file is corrupt, no point continuing
    }
}, concurrency: 10);
```

A hundred invalid addresses in a row is a reliable sign we've been handed the wrong file. No
new elements start after the `false`, the coroutines already running finish what they're doing,
and `iterate` returns.

Exceptions are stricter, and you already know the rule from Scope: an error in any handler stops
the traversal, cancels the remaining coroutines, and propagates outward. Fail-together by
default:

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

There's no magic behind it: inside `iterate` lives an ordinary child scope from chapter eight,
and it's the one keeping things tidy.

## A ladder of abstractions

Over six chapters a whole ladder has taken shape, and it's worth looking back over it once more,
from the bottom up:

- **A channel + Scope** — the primitives. Any topology: pools, pipelines, rendezvous,
  supervisors. Maximum control, maximum code.
- **`TaskGroup` / `TaskSet`** — ready-made assemblies for a set of tasks, when you need
  results: all of them, the first, the first successful, or one by one as they become ready.
- **`iterate()`** — a single line, when you don't need the result and just need to walk a
  collection concurrently.

The higher up the ladder, the less code and the narrower the scenario. Start at the top: if
`iterate` is enough, there's no reason to build a group; if a group isn't enough, drop down to
channels. At the bottom you can assemble any construction you like; at the top, everything is
already assembled for you.

Notice what happened to our import: chapter after chapter it kept shrinking, until it finally
fit on a single line. That's exactly how it should be. Concurrency stops being an event and
becomes an ordinary tool, just like `foreach`.

But one question from chapter nine is still hanging. For PDO, the connection pool is built into
the core, while `checkAddress` talks to `GeoDirectory` over HTTP. Its connections are worth
reusing too, and not just its: sockets, clients, heavy objects in general. Do we really have to
hand-build a pool out of a channel every single time? Fortunately, no, and the next chapter will
show you why.
