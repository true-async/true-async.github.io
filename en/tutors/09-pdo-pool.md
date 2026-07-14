---
layout: tutorial
lang: en
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /en/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "Why coroutines can't share a single PDO, and how the built-in connection pool solves that transparently."
---

# PDO Pool

The import is almost done: the workers check addresses via `GeoDirectory`. All
that's left is saving the checked addresses to the database. Sounds trivial:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        foreach ($queue as $address) {
                checkAddress($address);
                saveAddress($pdo, $address);
        }
    });
}
```

One `PDO` object shared by ten coroutines. In the chapter on channels we said
that data races don't happen within a single thread, so this should be fine,
right?

No. That's true for memory. But a database connection isn't memory, it's a
protocol on top of a socket: request, response, request, response, strictly
in order. Every database query is a wait point where a coroutine goes to
sleep and control passes to another one. And that other one writes its own
query into the very same socket:

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// wait point: worker 1 goes to sleep, worker 2 wakes up

// Worker 2
$pdo->beginTransaction(); // on the same connection!
$pdo->exec("UPDATE ...");
$pdo->commit(); // commits both its own transaction and someone else's
```

The responses get scrambled, transactions commit each other's work. The
races are back, only now they live in the connection instead of in memory.

All right, so give each coroutine its own connection?

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // its own connection
    // ...
});
```

Fine for ten workers. But picture not an import job, but a server, where a
coroutine gets created for every request. A thousand coroutines means a
thousand TCP connections. MySQL allows 151 by default, PostgreSQL 100. And
opening a connection for a few milliseconds of work is simply expensive: the
handshake with the database can take longer than the query itself.

Sound familiar? The chapter on channels had the same fork in the road: a
hundred thousand connections to `GeoDirectory`, or a queue for ten.

## A pool: a queue in reverse

The solution is called a connection pool: open N connections ahead of time
and hand them to coroutines for the duration of their work. As it happens,
we already know how to build one. A pool is a channel that holds connections:

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// Inside a coroutine:
$pdo = $pool->recv();   // take a connection
saveAddress($pdo, $address);
$pool->send($pdo);      // return it
```

Free connections sit in the buffer. If they're all busy, `recv` puts the
coroutine to sleep until somebody returns a connection. The same
synchronization from the previous chapter, only the queue holds resources
instead of tasks.

The scheme works, but it has a weak spot: you have to remember to return the
connection, no matter what happens, including an exception or a cancellation.
And then there are transactions, broken connections, reconnects. For PDO,
all of that has already been taken care of, right in the core.

## PDO Pool

The pool is built into `PDO` itself and is turned on via constructor
attributes:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

From the outside, nothing changed: that very first example, where a single
`$pdo` goes out to ten workers, is now correct. The `$pdo` object is no
longer a connection, it's a facade for the pool. When a coroutine runs its
first query, the pool hands it a dedicated connection, and all of that
coroutine's queries go through it. Once the coroutine finishes, the
connection goes back to the pool, ready for the next coroutine.

No manual `recv` and `send`: acquiring and returning happen on their own, at
the right moments, no matter how things turn out. The code looks like
ordinary synchronous PHP with an ordinary PDO, and that was the whole idea.

## Transactions

A transaction is state that belongs to a connection, so the pool treats it
specially: while a transaction is open, the connection is pinned to its
coroutine and won't go back to the pool:

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // only now can the connection return to the pool
});
```

What if a coroutine finishes without calling `commit`? Recall the chapter on
Scope: a worker could get cancelled right in the middle of a transaction, and
that's a normal scenario, not a catastrophe. Before returning the connection,
the pool automatically runs a `ROLLBACK`. An unfinished transaction won't
leak into the next coroutine or hang around in the database.

## When a connection drops

An import can run for an hour. Within an hour, the database might restart,
the network might blip, or a DBA might kill a session. In classic PHP the
script would simply crash, but a long-running application needs to be able
to keep going.

The pool checks connections when they're returned: a broken one gets
destroyed instead of being handed to the next coroutine. And if a query
fails because of a dropped connection, simply retrying it on the same
`$pdo` is enough, the pool will hand the coroutine a fresh connection:

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // the pool has already swapped in a new connection
}
```

No need to write reconnect logic, no need to recreate the `PDO` object. Just
retry the query, the pool takes care of everything else.

In the end, the code works as if every coroutine had its own database
connection. In reality there are only ten connections, and the pool
constantly passes them from hand to hand, keeps an eye on transactions, and
discards the dead ones. But none of that kitchen work shows from the
outside, and that's the main benefit: we just write ordinary code with PDO.

By the way, our workers are still working half-blind: they check addresses
and save them, but nobody's counting how many addresses turned out to be bad,
or which ones. How do we get results back from coroutines and collect them
conveniently? That's what we'll tackle in the next chapter.
