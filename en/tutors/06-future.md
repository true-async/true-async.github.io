---
layout: tutorial
lang: en
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /en/tutors/06-future.html
page_title: "Future"
description: "Future and FutureState: a promise of a result that isn't tied to a coroutine."
---

# Future

In the previous chapters we found that a coroutine behaves like a promise of a result:
`await` can be called as many times as you like, and it always returns the same thing.
But a coroutine has a hard constraint: the result is always produced by the function
that `spawn` started. One call, one function, one result.

But what if the result doesn't come from a function at all?

Let's go back to `ProfileService`. A user changes their delivery address, and before
saving it, the address needs to be checked against a directory of regions served
by the `GeoDirectory` service:

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

The directory is large, slow to load, and the same for everyone. At the same time,
every profile-update request needs it, and requests are handled concurrently.
Calling `spawn(loadRegions(...))` in each one means bombarding `GeoDirectory` with
identical requests for the sake of an identical answer. Wasteful.

What we'd like is for the first request to actually load the directory, while all
the others wait for its result. For that we need a place where one piece of code
puts the result and another picks it up.

That place can be a `Future`.

## FutureState and Future

`Future` is a promise and a container for a result. It isn't tied to a coroutine,
but it works with the `await` we already know.

`Future` consists of two objects:

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — writes the result. It stays with whoever produces the result.
- **`Future`** — reads the result. It's handed to whoever is waiting for the result.

The producer completes the operation, the consumer waits for it via the familiar `await`:

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

Why two objects instead of one? The split protects against mistakes.
Whoever holds a `Future` physically cannot complete the operation: there's no such
method on it. Only the owner of the `FutureState` is allowed to write the result,
and only once:

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

If the operation fails, an exception is written instead of a result,
and `await` will throw it for everyone who's waiting:

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## Solving the directory problem

Now we can build directory loading that concurrent requests share between them:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

The first call to `regions` starts a coroutine that does the actual loading.
Every subsequent call gets the same `Future` and waits on one shared result.
Once the directory is loaded, `await` starts returning it instantly, no matter
how many times it's asked:

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

However many requests are handled concurrently, `GeoDirectory` gets hit exactly once,
while `RegionsDirectory` stays an ordinary service: it can be wired up in a DI container,
swapped out in tests, and all its state lives in a single `$future` field.
Note that `await` works the same way with a coroutine and with a `Future`,
including the timeout from the previous chapter:

```php
$regions = await($directory->regions(), timeout(2000));
```

## A result you already have

Sometimes the result is known ahead of time. For example, the region directory
gets warmed up when the service starts and is already sitting in memory. There's
no point creating a `FutureState` and a coroutine just for an already-known value,
so there are factory methods for that:

```php
// the result is already there
$future = Future::completed($regionsFromWarmup);

// the error is already known
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

The `regions` method can return such a `Future`, and the consumer won't notice
the difference: it still calls `await` and gets the result immediately.

## A classic technique: memoization

`RegionsDirectory` already implements a classic technique called memoization:
compute the result once and hand it out to every repeated call. The technique
is general enough to be wrapped around any function with arguments:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // a request to GeoDirectory
$fr = await($regionsOf('FR')); // a request to GeoDirectory
$de = await($regionsOf('DE')); // instant, from the cache
```

Notice a subtlety: the cache holds the `Future` itself, not a plain value.
A naive memoization in concurrent code would suffer from a race: while the first
call is waiting for `GeoDirectory`'s answer, a second call checks the cache, sees
it empty, and fires off a duplicate request. There's no such gap here. The `Future`
lands in the cache immediately, before the computation even starts, so the second
call finds it and simply waits.

The technique has a boundary: memoization only works for data that doesn't change
for the life of the process. Caching a token check or a currency rate this way
would be a mistake: they depend on time, and such a cache needs a lifetime after
which the result is fetched again. For the same reason, errors deserve separate
thought: a failed `Future` would also stay in the cache forever, and it's usually
better to remove it so the next call retries.

The main thing to take from this chapter: a coroutine answers the question
"how do I get the result", while a `Future` simply promises that a result will
exist. Where it comes from, a coroutine, a cache, or another thread, is none
of the consumer's business. The producer and the consumer have agreed on a
result and know nothing else about each other.

But what if there isn't just one result, but an entire stream of values that
need to travel from coroutine to coroutine? There's a separate tool for that,
and that's the subject of the next chapter.
