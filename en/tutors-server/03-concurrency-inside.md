---
layout: tutorial
lang: en
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /en/tutors-server/03-concurrency-inside.html
page_title: "Concurrency Inside a Request"
description: "TaskGroup in a handler, the PDO Pool under load, and request_context()."
---

# Concurrency Inside a Request

In the previous chapter `showProfile` loaded the profile in a single
line, and I honestly pretended there was nothing behind it. Time to
come clean. Behind it are three sources: user data from the database,
orders from the database, reviews from an external API. Three
independent trips for data.

A familiar problem? Of course. This is chapter ten of the first series
word for word, and the solution carries over without a single change:

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

The three requests go out concurrently. The page is assembled in the
time of the slowest source, not the sum of all three. There's a
timeout, there's fail-together, there's `CompositeException`.

Here it's important to feel one thing: the server introduced no
concurrency rules of its own. None whatsoever. The handler is an
ordinary coroutine, and inside it everything you already know works.
The server just opened a door through which HTTP requests step into
the world you already know.

## The Pool Under Real Load

Remember chapter nine of the first series? Ten import workers, one
`PDO` object, tangled transactions, chaos. Back then it was a teaching
example with ten coroutines. Well, forget about ten.

In a server, there are as many concurrent database users as there are
requests currently in flight. Twenty. Five hundred. As many as the
traffic drives in, and you don't control that number. The only thing
that saves you, you already know:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

The mechanics are the same as before: each coroutine owns a connection
exclusively at its moment, transactions are pinned, and a dropped
connection is quietly replaced with a fresh one. But `POOL_MAX` has a
new job now. It's now a fuse between the storm and the database: a
thousand concurrent requests will line up in a queue for sixteen
connections. Agreed, that's better than a thousand connections
arriving at PostgreSQL at once.

## Whose Request Is This?

Chapter fifteen of the first series ended with the question of where
to store the "current": the user, the locale, the request identifier.
Back then we built the answer on contexts. The server carries this
story through to the end, and does it beautifully.

Each handler runs in its own scope. And the request scope has a
context shared across the whole coroutine tree of that request:

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... even ten levels of calls deeper ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` may be called from the handler. From a coroutine it spawned.
From a coroutine inside a `TaskGroup` inside a service inside a
repository. It doesn't matter: `request_context()` is one and the same
everywhere, as long as we're inside this request. And the neighboring
request, being processed interleaved with ours right now? It has its
own. Three hundred concurrent requests, three hundred independent
`request_id`s, zero global variables.

The difference from `current_context()` can now be phrased in one
line: that one is about a single coroutine, this one is about the
whole request.

## Scope Cleans Up After the Request

And the last consequence, the most invisible and the most valuable.
Because the handler lives in a scope, the whole of chapter eight of
the first series applies to the request automatically, without a
single action on your part.

Spawned a coroutine and forgot to await it? The request finishes, the
scope cleans up. The client dropped the connection halfway? The server
cancels the request scope, cancellation cooperatively reaches every
child coroutine, and every `finally` releases its own. Remember how
much discipline structured concurrency demanded? Here it stopped being
discipline. It's now a property of the platform: the life of any
request coroutine is bounded by the request itself. Full stop.

That's it for the invisible part of the server. Next come bytes, and
plenty of them: the client uploads a gigabyte file, and we hand back a
two-gigabyte report. Where do we put all of it so we don't wake the
OOM killer? The next chapter is about exactly that.
