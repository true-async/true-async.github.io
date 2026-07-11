---
layout: tutorial
lang: en
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /en/tutors/15-context.html
page_title: "Context"
description: "Context: where to keep \"the current one\" once global variables stop working."
---

# Context

Classic PHP lived its whole life by one simple rule: one process, one request. A whole culture
grew out of that rule: global variables, static properties, singletons. The current user? The
static property `Auth::$user`. A request ID for logging? A global variable. It worked
flawlessly, because "the current one" really was one single thing for the whole process.

TrueAsync abolished that rule. Now hundreds of coroutines live mixed together in a single
process, serving different users. Assign `Auth::$user` in one coroutine, and the next one to
wake up will read it back, and you're lucky if that's even the same request. A familiar story:
the same thing happened in chapter nine, when ten workers shared a single `PDO`. Races without
threads, only now it's in global state.

Pass everything as parameters instead? Honest, but merciless: you'd have to thread an
authorization token through twenty function signatures, when only one of them actually needs it.
What you really want is storage tied not to the process, but to the logical thread of execution.
And we already have a structure fit for the job: coroutines and scopes already form a tree.

## Storage on a tree

`Async\Context` is a key-value store attached to a scope or to a coroutine. A scope's context is
available to all of its coroutines:

```php
use function Async\current_context;

// middleware, start of request handling
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

And from there, anywhere, at any call depth, without a single extra parameter:

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

Notice `find`: it looks for the key in the current context, and if it doesn't find it, climbs up
the scope tree. Child scopes automatically see their parents' data, so a coroutine started deep
inside a handler will find the `request_id` set at the very start of the request. It's the same
mechanism as Go's `context.Context`, except you don't have to look it up and pass it around by
hand: the tree is already there.

Requests no longer get in each other's way: each one has its own scope, and therefore its own
context. A thousand concurrent requests, a thousand independent `request_id`s, and not a single
global variable.

## Three levels

Context exists on three levels, from widest to narrowest:

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // the whole process: configuration, shared by everyone
current_context();   // the current scope: request, user, locale
coroutine_context(); // just this coroutine: private data
```

`root_context` is the legitimate home for whatever used to rightfully be a global variable: the
application name, settings. You address it explicitly: `root_context()->find('app_name')`.
`coroutine_context` is the opposite pole: its data is invisible to anyone but the coroutine
itself, even its neighbors in the same scope. Between the two, `find` stitches the scope levels
together: didn't find it locally, ask the parent.

And one more pleasant detail:

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException: key already exists
```

Overwriting is forbidden unless you explicitly ask for it (`replace: true`). The context guards
itself against the very disease of global variables this chapter started with: someone,
somewhere, quietly overwriting a value.

## The end of the journey

Fifteen chapters ago we launched two functions "at the same time" and were surprised to see
their output interleave. Since then, a whole system has taken shape, and every level of it has
its own concern:

- **Coroutines, `spawn`, `await`** — the unit of concurrency and a promise of a result.
- **Cancellation, timeouts, exceptions** — the interruption contract: nothing runs forever, and
  nothing dies silently.
- **`Future` and channels** — connections: a single result, and a stream of values with
  synchronization.
- **`Scope`, `TaskGroup`, `TaskSet`, `iterate`** — structure: every coroutine has an owner, and
  every group has a waiting strategy.
- **Pools** — resource discipline: few connections, many coroutines.
- **Threads** — parallelism for computation, without shared memory.
- **`Context`** — data tied to execution, not to the process.

Notice what we never had to learn: mutexes, semaphores, data races, callbacks, or coloring
functions async versus sync. The code stayed ordinary, sequential PHP that simply stopped
sitting idle.

From here, two paths. For hands-on practice, head to the [documentation](/en/docs.html), where
every component is taken apart down to the last screw. For understanding how it all works
underneath, head to the [architecture](/en/architecture.html). Or best of all, just take your
slowest script and see what a single `spawn` does to it.
