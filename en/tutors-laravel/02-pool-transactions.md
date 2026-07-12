---
layout: tutorial
lang: en
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /en/tutors-laravel/02-pool-transactions.html
page_title: "Connection Pool and Transactions"
description: "PDO Pool under Eloquent and CoroutineTransactions: why the nested transaction counter can't stay on a Connection property."
---

# Connection Pool and Transactions

`Auth`, `session`, `request`: we settled those in the previous chapter,
context plus a proxy, and the framework stopped confusing requests. The
database seems even simpler: chapter nine of the core series already
solved it, the `PDO Pool` hands each coroutine its own connection and
takes it back on its own. What could possibly go wrong for `Eloquent`
here?

It can. The pool transparently manages the connection. But it knows
nothing about another piece of state that `Laravel` keeps right next
to that connection: the transaction nesting counter.

## Where `transactionLevel()` Lives

Inside `Illuminate\Database\Connection` there's an ordinary instance
property:

```php
protected $transactions = 0;
```

`beginTransaction()` increments it, `commit()` and `rollBack()`
decrement it. As long as one `Connection` serves one process, this
makes perfect sense: one property, one transaction. But `PDO Pool`
operates a layer below `Connection`. It swaps the physical connection
underneath the object, while the `Connection` object itself, the one
`$this->transactions` is attached to, is still one single instance
shared across the whole `DatabaseManager`.

Let's replay the scenario from the previous chapter, this time with
the database:

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // the coroutine falls asleep right inside the transaction
    });

    $response->json(['ok' => true]);
});
```

Two requests enter `DB::transaction()` concurrently. Both physical
connections are honestly handed out by the pool, each its own. But
`$this->transactions` for both is the same number on the same
`Connection` object. The first coroutine bumps the counter to `1`,
then sleeps. The second bumps it too, but now to `2`, even though for
it this should have been an outer transaction at level `1`.
`commit()` in the first coroutine multiplies against the wrong
nesting level, and Laravel silently issues a `SAVEPOINT` where it
shouldn't, or commits a transaction early that a neighboring
coroutine is still holding open.

## Same Recipe, Different Scope: Coroutine, Not the Request Tree

In the previous chapter `auth` state lived in scope context because
it's shared across every coroutine of one request. The transaction
counter is built differently: `PDO Pool` hands out a physical
connection per *coroutine*, not per whole request (a parallel
`TaskGroup` inside a handler gets two separate connections from the
pool). So the counter has to live in coroutine context, not scope
context:

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack(), and the error handlers
    // are overridden the same way: instead of reading and writing
    // $this->transactions, they go through setTransactionLevel()/transactionLevel().
}
```

`coroutine_context()` versus `current_context()`, that's exactly the
boundary discussed back in the `Context` chapter of the core series:
the first is private to a single coroutine, the second is shared
across a request's whole coroutine tree. The choice here isn't a
matter of style, it's mandatory: mix them up and two parallel trips
to the database inside one request start sharing someone else's
transaction counter again, the hole just moves up a floor.

The trait doesn't rewrite `Connection` wholesale, it surgically
intercepts the methods that touch `$this->transactions`, and it's
attached to a specific connection class:

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

There's a separate class per `DBMS`, `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`, `AsyncSqliteConnection`,
`AsyncSqlServerConnection`, because Laravel's parent classes already
differ, while the counter-isolation trait is the same one for all of
them.

## Why You Can't Just Scope the Whole `DatabaseManager`

The temptation is there: since we already know how to hide a service
behind context (`ScopedServiceProxy` from the previous chapter), why
not do the same for `db`? The reason it doesn't happen is fairly
unpleasant. `DatabaseServiceProvider::boot()` writes this once at
startup:

```php
Model::setConnectionResolver($app['db']);
```

That's a static property on the `Model` class itself, shared by every
model and every request. If `db` resolved differently for each scope,
this static reference would keep pointing at the `DatabaseManager` of
whichever request created it first. Once that request's scope
finishes and cleans up, the object `Model::$resolver` points to gets
garbage collected, and the static property is left pointing at dead
memory. The result isn't "wrong data", it's the whole process crashing.

So `db` stays a singleton, as it always was. Physical connection
isolation is `PDO Pool`'s job at the `C` level, not the dependency
container's. Transaction counter isolation is the trait's job at the
level of a single coroutine. Two narrow, precise tools instead of one
big refactor that would additionally bring the server down.

We've dealt with request state and transaction state. Laravel handles
ordinary HTTP responses on its own, buffering them whole. But what if
the response isn't a one-off, but a stream: a progress bar to the
browser, or a call from a neighboring service over gRPC? That's where
we head in the next chapter.
